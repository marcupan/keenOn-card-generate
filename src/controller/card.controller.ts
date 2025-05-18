import * as grpc from '@grpc/grpc-js';
import { NextFunction, Request, Response } from 'express';
import { ParsedQs } from 'qs';
import { FindOptionsOrder, FindOptionsWhere, ILike, IsNull } from 'typeorm';

import { DB_UNIQUE_VIOLATION_ERR_CODE } from '../const/code';
import { Card } from '../entities';
import {
	CreateCardInput,
	DeleteCardInput,
	GenerateCardInput,
	GetCardInput,
	UpdateCardInput,
} from '../schema/card.schema';
import {
	countCards,
	createCard,
	findCards,
	getCard,
} from '../service/card.service';
import { getFolder } from '../service/folder.service';
import { findUserById } from '../service/user.service';
import { ErrorCode, ErrorType } from '../types/error';
import { AppError } from '../utils/appError';
import composeClient from '../utils/composeClient';
import translationClient from '../utils/translationClient';

interface GrpcError extends Error {
	code: grpc.status;
	details?: string;
	metadata?: grpc.Metadata;
}

const ALLOWED_CARD_SORT_FIELDS: Array<keyof Card> = [
	'word',
	'created_at',
	'updated_at',
];

const DEFAULT_CARD_SORT_ORDER: FindOptionsOrder<Card> = {
	created_at: 'DESC',
};

const MAX_TAKE_LIMIT = 100;
const DEFAULT_TAKE = 10;

function isGrpcError(error: unknown): error is GrpcError {
	return (
		error instanceof Error &&
		Object.values(grpc.status).includes((error as GrpcError).code)
	);
}

function mapGrpcErrorToAppError(grpcErr: GrpcError): AppError {
	let statusCode = 500;
	let message =
		'An unexpected error occurred communicating with a dependent service.';
	let serviceName = 'Dependent service';

	if (grpcErr.message.toLowerCase().includes('translation')) {
		serviceName = 'Translation service';
	} else if (
		grpcErr.message.toLowerCase().includes('compose') ||
		grpcErr.message.toLowerCase().includes('image')
	) {
		serviceName = 'Image composition service';
	}

	switch (grpcErr.code) {
		case grpc.status.DEADLINE_EXCEEDED:
			statusCode = 504;
			message = `The ${serviceName} took too long respond.`;
			break;
		case grpc.status.UNAVAILABLE:
		case grpc.status.CANCELLED:
		case grpc.status.UNKNOWN:
			statusCode = 503;
			message = `The ${serviceName} is currently unavailable or unreachable.`;
			break;
		case grpc.status.NOT_FOUND:
			statusCode = 404;
			message =
				`Could not find requested details via ${serviceName}. ${grpcErr.details || ''}`.trim();
			break;
		case grpc.status.INVALID_ARGUMENT:
			statusCode = 400;
			message = `Invalid data sent to ${serviceName}: ${grpcErr.details || grpcErr.message}`;
			break;
		case grpc.status.INTERNAL:
			statusCode = 500;
			message =
				`The ${serviceName} encountered an internal error. ${grpcErr.details || ''}`.trim();
			break;
		default:
			statusCode = 500;
			message = `${serviceName} error (code ${grpcErr.code}): ${grpcErr.details || grpcErr.message}`;
			break;
	}

	return new AppError(ErrorCode.INTERNAL_SERVER_ERROR, message, statusCode, {
		originalError: grpcErr,
	});
}

export const generateCardHandler = async (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		GenerateCardInput
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const { word, imageBase64 } = req.body;

		if (!word) {
			return next(
				new AppError(
					ErrorCode.BAD_REQUEST,
					'Chinese word is required',
					400
				)
			);
		}

		if (
			!imageBase64 ||
			typeof imageBase64 !== 'string' ||
			!imageBase64.startsWith('data:image')
		) {
			return next(
				new AppError(
					ErrorCode.BAD_REQUEST,
					'Valid base64 image data is required',
					400
				)
			);
		}

		const rawImageBase64 = imageBase64.includes(',')
			? imageBase64.split(',')[1]
			: imageBase64;

		if (!rawImageBase64) {
			console.warn(
				`[API] Invalid base64 format after splitting prefix. Word: ${word}`
			);

			return next(
				new AppError(
					ErrorCode.BAD_REQUEST,
					'Invalid base64 image data format provided.',
					400
				)
			);
		}

		console.info(`[API] Calling translation service for word: "${word}"`);

		let translationResponse;

		try {
			translationResponse = await translationClient.Translate({
				chineseWord: word,
			});

			console.info(
				`[API] Received translation response for word: "${word}"`
			);
		} catch (err) {
			console.error(
				`[API] Error calling translation service for word "${word}":`,
				err
			);

			if (isGrpcError(err) && err.code === grpc.status.NOT_FOUND) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						`Translation service could not find the word: "${word}"`,
						404
					)
				);
			}

			throw err;
		}

		const { translation, individualTranslations, exampleSentences } =
			translationResponse;

		if (
			!translation &&
			!individualTranslations?.length &&
			!exampleSentences?.length
		) {
			console.warn(
				`[API] Translation service returned empty data for word: "${word}".`
			);
		} else {
			console.debug(`[API] Translation details for "${word}":`, {
				translation,
				individualTranslations,
				exampleSentences,
			});
		}

		console.info(`[API] Calling compose service for word: "${word}"`);

		let composeResponse;

		try {
			composeResponse = await composeClient.ComposeImage({
				imageBase64: rawImageBase64,
				translation: translation || '',
				individualTranslations: individualTranslations || [],
				exampleSentences: exampleSentences || [],
			});
			console.info(
				`[API] Received composed image response for word: "${word}" (Length: ${composeResponse?.composedImage?.length})`
			);
		} catch (err) {
			console.error(
				`[API] Error calling compose service for word "${word}":`,
				err
			);

			throw err;
		}

		const { composedImage } = composeResponse;

		if (!composedImage || composedImage.length === 0) {
			console.error(
				`[API] Image composition service returned an empty image for word: "${word}".`
			);

			return next(
				new AppError(
					ErrorCode.INTERNAL_SERVER_ERROR,
					'Image composition service failed to produce an image.',
					500
				)
			);
		}

		const composedImageBase64 =
			Buffer.from(composedImage).toString('base64');
		const responseData = {
			image: `data:image/png;base64,${composedImageBase64}`,
			translation: translation || null,
			characterBreakdown: individualTranslations || [],
			exampleSentences: exampleSentences || [],
		};

		res.status(200).json({
			status: 'success',
			data: responseData,
		});
	} catch (err: unknown) {
		console.error('[API] Unhandled error in generateCardHandler:', err);

		let appError: AppError;

		if (isGrpcError(err)) {
			appError = mapGrpcErrorToAppError(err);
		} else if (err instanceof AppError) {
			appError = err;
		} else if (err instanceof Error) {
			appError = new AppError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				`An unexpected server error occurred: ${err.message}`,
				500,
				{ originalError: err }
			);
		} else {
			appError = new AppError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				`An unexpected server error occurred.`,
				500
			);
		}

		return next(appError);
	}
};

export const createCardHandler = async (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		CreateCardInput
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const { folderId, ...cardData } = req.body;
		const userId = res.locals.user?.id;

		if (!userId) {
			console.warn('[API] Unauthorized attempt to create card.');

			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					'Authentication required.',
					401
				)
			);
		}

		const user = await findUserById(userId);

		if (!user) {
			console.error(
				`[API] User from token not found in DB. UserID: ${userId}`
			);

			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					'Invalid user session.',
					401
				)
			);
		}

		let folder;

		if (folderId) {
			folder = await getFolder(folderId);

			if (!folder) {
				console.warn(
					`[API] Folder specified for card creation not found. FolderID: ${folderId}`
				);

				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						`Folder with ID ${folderId} not found`,
						404
					)
				);
			}
		}

		console.info(
			`[API] Creating card for UserID: ${userId}, FolderID: ${folderId || 'None'}`
		);

		const card = await createCard(cardData, user, folder);

		console.info(`[API] Card created successfully. CardID: ${card.id}`);

		res.status(201).json({
			status: 'success',
			data: {
				card,
			},
		});
	} catch (err: unknown) {
		const error = err as ErrorType & { code?: string };

		console.error('[API] Error during card creation:', err);

		if (error.code === DB_UNIQUE_VIOLATION_ERR_CODE) {
			console.warn('[API] Card unique constraint violation:', error);

			return next(
				new AppError(
					ErrorCode.CONFLICT,
					'A card with that title or identifier already exists.',
					409
				)
			);
		}

		if (err instanceof AppError) {
			return next(err);
		}

		next(error);
	}
};

export const getCardHandler = async (
	req: Request<GetCardInput>,
	res: Response,
	next: NextFunction
) => {
	try {
		const cardId = req.params.cardId;

		const card = await getCard(cardId);

		if (!card) {
			console.warn(`[API] Card not found. CardID: ${cardId}`);

			return next(
				new AppError(
					ErrorCode.NOT_FOUND,
					'Card with that ID not found',
					404
				)
			);
		}

		if (card.user.id !== res.locals.user?.id) {
			return next(new AppError(ErrorCode.FORBIDDEN, 'Forbidden', 403));
		}

		console.info(`[API] Card retrieved successfully. CardID: ${cardId}`);

		res.status(200).json({
			status: 'success',
			data: {
				card,
			},
		});
	} catch (err: unknown) {
		console.error(
			`[API] Error retrieving card. CardID: ${req.params.cardId}:`,
			err
		);

		next(err);
	}
};

export const getCardsHandler = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const userId = res.locals.user?.id;

		if (!userId) {
			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					'Authentication required to view cards.',
					401
				)
			);
		}

		const query: ParsedQs = req.query;

		let skip = 0;
		if (query.skip && typeof query.skip === 'string') {
			skip = parseInt(query.skip, 10);
			if (isNaN(skip) || skip < 0) skip = 0;
		}

		let take = DEFAULT_TAKE;
		if (query.take && typeof query.take === 'string') {
			take = parseInt(query.take, 10);
			if (isNaN(take) || take < 1) take = DEFAULT_TAKE;
			take = Math.min(take, MAX_TAKE_LIMIT);
		}

		let sort: string | undefined = undefined;
		let order: 'ASC' | 'DESC' = 'ASC';

		if (
			query.sort &&
			typeof query.sort === 'string' &&
			ALLOWED_CARD_SORT_FIELDS.includes(query.sort as keyof Card)
		) {
			sort = query.sort;
			if (
				query.order &&
				typeof query.order === 'string' &&
				query.order.toUpperCase() === 'DESC'
			) {
				order = 'DESC';
			}
		}

		const search: string | undefined =
			query.search && typeof query.search === 'string'
				? query.search.trim()
				: undefined;
		const folderId: string | undefined =
			query.folderId && typeof query.folderId === 'string'
				? query.folderId.trim()
				: undefined;

		const where: FindOptionsWhere<Card> = {
			user: { id: userId },
		};

		if (folderId) {
			if (
				folderId.toLowerCase() === 'null' ||
				folderId.toLowerCase() === 'none'
			) {
				where.folder = IsNull();
			} else {
				where.folder = { id: folderId };
			}
		}

		if (search) {
			where.word = ILike(`%${search}%`);
		}

		let orderOptions: FindOptionsOrder<Card> = DEFAULT_CARD_SORT_ORDER;
		if (sort) {
			orderOptions = { [sort]: order };
		}

		console.info(
			`[API] Fetching cards for UserID: ${userId} with Query:`,
			query,
			`Applied Filters:`,
			where,
			`Applied Order:`,
			orderOptions
		);

		const cards = await findCards({
			where,
			order: orderOptions,
			skip,
			take,
		});

		const totalCount = await countCards(where);

		console.info(
			`[API] Cards retrieved successfully for UserID: ${userId}. Count: ${cards.length}`
		);

		res.status(200).json({
			status: 'success',
			data: {
				cards,
			},
			meta: {
				skip,
				take,
				total: totalCount,
				folderId: folderId || undefined,
				sort: Object.keys(orderOptions)[0],
				order: Object.values(orderOptions)[0],
			},
		});
	} catch (err: unknown) {
		console.error(
			`[API] Error retrieving cards for UserID: ${res.locals.user?.id}:`,
			err
		);

		next(err);
	}
};

export const updateCardHandler = async (
	req: Request<
		UpdateCardInput['params'],
		Record<string, string>,
		UpdateCardInput['body']
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const { folderId, ...updateData } = req.body;

		const cardId = req.params.cardId;
		const userId = res.locals.user?.id;

		console.info(
			`[API] Updating card. CardID: ${cardId}, UserID: ${userId}`
		);

		const card = await getCard(cardId);

		if (!card) {
			console.warn(`[API] Card to update not found. CardID: ${cardId}`);

			return next(
				new AppError(
					ErrorCode.NOT_FOUND,
					'Card with that ID not found',
					404
				)
			);
		}

		if (card.user.id !== userId) {
			return next(new AppError(ErrorCode.FORBIDDEN, 'Forbidden', 403));
		}

		if (folderId) {
			const folder = await getFolder(folderId);
			if (!folder) {
				console.warn(
					`[API] Folder specified for card update not found. FolderID: ${folderId}`
				);

				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						'Folder with that ID not found',
						404
					)
				);
			}

			if (folder.user.id !== userId) {
				return next(
					new AppError(ErrorCode.FORBIDDEN, 'Forbidden', 403)
				);
			}

			card.folder = folder;
		}

		Object.assign(card, updateData);

		const updatedCard = await card.save();

		console.info(`[API] Card updated successfully. CardID: ${cardId}`);

		res.status(200).json({
			status: 'success',
			data: { card: updatedCard },
		});
	} catch (err: unknown) {
		const error = err as ErrorType & { code?: string };

		console.error(
			`[API] Error updating card. CardID: ${req.params.cardId}:`,
			err
		);

		if (error.code === DB_UNIQUE_VIOLATION_ERR_CODE) {
			console.warn(
				'[API] Card unique constraint violation on update:',
				error
			);

			return next(
				new AppError(
					ErrorCode.CONFLICT,
					'Update failed due to conflicting identifier.',
					409
				)
			);
		}

		if (err instanceof AppError) {
			return next(err);
		}

		next(err);
	}
};

export const deleteCardHandler = async (
	req: Request<DeleteCardInput>,
	res: Response,
	next: NextFunction
) => {
	const cardId = req.params.cardId;
	const userId = res.locals.user?.id;

	console.info(`[API] Deleting card. CardID: ${cardId}, UserID: ${userId}`);

	try {
		const card = await getCard(cardId);

		if (!card) {
			console.warn(`[API] Card to delete not found. CardID: ${cardId}`);

			return next(
				new AppError(
					ErrorCode.NOT_FOUND,
					'Card with that ID not found',
					404
				)
			);
		}

		await card.remove();

		console.info(`[API] Card deleted successfully. CardID: ${cardId}`);

		res.status(204).json({
			status: 'success',
			data: null,
		});
	} catch (err: unknown) {
		console.error(`[API] Error deleting card. CardID: ${cardId}:`, err);

		next(err);
	}
};
