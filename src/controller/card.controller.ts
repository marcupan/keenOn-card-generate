import * as grpc from '@grpc/grpc-js';
import { NextFunction, Request, Response } from 'express';
import { FindOptionsOrder, FindOptionsWhere, ILike } from 'typeorm';

import { DB_UNIQUE_VIOLATION_ERR_CODE } from '../const/code';
import { Card } from '../entities';
import {
	CreateCardInput,
	DeleteCardInput,
	GenerateCardInput,
	GetCardInput,
	GetCardsInput,
	UpdateCardInput,
} from '../schema/card.schema';
import { createCard, findCards, getCard } from '../service/card.service';
import { getFolder } from '../service/folder.service';
import { findUserById } from '../service/user.service';
import { ErrorType } from '../types/error';
import AppError from '../utils/appError';
import composeClient from '../utils/composeClient';
import translationClient from '../utils/translationClient';

interface GrpcError extends Error {
	code: grpc.status;
	details?: string;
	metadata?: grpc.Metadata;
}

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

	return new AppError(statusCode, message, { originalError: grpcErr });
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
			return next(new AppError(400, 'Chinese word is required'));
		}

		if (
			!imageBase64 ||
			typeof imageBase64 !== 'string' ||
			!imageBase64.startsWith('data:image')
		) {
			return next(
				new AppError(400, 'Valid base64 image data is required')
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
				new AppError(400, 'Invalid base64 image data format provided.')
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
						404,
						`Translation service could not find the word: "${word}"`
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
					500,
					'Image composition service failed to produce an image.'
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
				500,
				`An unexpected server error occurred: ${err.message}`,
				{ originalError: err }
			);
		} else {
			appError = new AppError(
				500,
				`An unexpected server error occurred.`
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

			return next(new AppError(401, 'Authentication required.'));
		}

		const user = await findUserById(userId);

		if (!user) {
			console.error(
				`[API] User from token not found in DB. UserID: ${userId}`
			);

			return next(new AppError(401, 'Invalid user session.'));
		}

		let folder;

		if (folderId) {
			folder = await getFolder(folderId);

			if (!folder) {
				console.warn(
					`[API] Folder specified for card creation not found. FolderID: ${folderId}`
				);

				return next(
					new AppError(404, `Folder with ID ${folderId} not found`)
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
					409,
					'A card with that title or identifier already exists.'
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

			return next(new AppError(404, 'Card with that ID not found'));
		}

		if (card.user.id !== res.locals.user?.id) {
			return next(new AppError(403, 'Forbidden'));
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
	req: Request<
		Record<string, string>,
		Record<string, string>,
		Record<string, string>,
		GetCardsInput
	>,
	res: Response,
	next: NextFunction
) => {
	try {
		const {
			search,
			sort,
			order = 'ASC',
			select,
			relations,
			skip = 0,
			take = 10,
		} = req.query;

		const userId = res.locals.user?.id;

		if (!userId) {
			return next(
				new AppError(401, 'Authentication required to view cards.')
			);
		}

		const where: FindOptionsWhere<Card> | FindOptionsWhere<Card>[] = {
			user: { id: userId },
			// TODO: add folder id
			// folder: { id: '' },
		};

		if (search && typeof search === 'string' && search.trim() !== '') {
			where.word = ILike(`%${search}%`);
		}

		let orderOptions: FindOptionsOrder<Card> | undefined = undefined;

		const allowedSortFields: Array<keyof Card> = [
			'word',
			'created_at',
			'updated_at',
		];

		if (
			sort &&
			typeof sort === 'string' &&
			allowedSortFields.includes(sort as keyof Card)
		) {
			const sortDirection =
				order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
			orderOptions = {
				[sort]: sortDirection,
			};
		} else {
			orderOptions = {
				created_at: 'DESC',
			};
		}

		const validatedTake = Math.min(Math.max(1, Number(take) || 10), 100);
		const validatedSkip = Math.max(0, Number(skip) || 0);

		console.info(
			`[API] Fetching cards for UserID: ${userId} with query:`,
			req.query
		);

		const cards = await findCards({
			where,
			select,
			relations,
			order: orderOptions,
			skip: validatedSkip,
			take: validatedTake,
		});

		console.info(
			`[API] Cards retrieved successfully for UserID: ${userId}. Count: ${cards.length}`
		);

		res.status(200).json({
			status: 'success',
			data: {
				cards,
			},
			meta: {
				skip: validatedSkip,
				take: validatedTake,
				sort:
					sort && allowedSortFields.includes(sort as keyof Card)
						? sort
						: 'createdAt',
				order: orderOptions ? Object.values(orderOptions)[0] : 'DESC',
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

			return next(new AppError(404, 'Card with that ID not found'));
		}

		if (card.user.id !== userId) {
			return next(new AppError(403, 'Forbidden'));
		}

		if (folderId) {
			const folder = await getFolder(folderId);
			if (!folder) {
				console.warn(
					`[API] Folder specified for card update not found. FolderID: ${folderId}`
				);

				return next(new AppError(404, 'Folder with that ID not found'));
			}

			if (folder.user.id !== userId) {
				return next(new AppError(403, 'Forbidden'));
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
					409,
					'Update failed due to conflicting identifier.'
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

			return next(new AppError(404, 'Card with that ID not found'));
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
