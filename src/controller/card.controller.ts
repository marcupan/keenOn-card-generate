import * as grpc from '@grpc/grpc-js';
import type { ParsedQs } from 'qs';
import type { FindOptionsOrder, FindOptionsWhere } from 'typeorm';
import { ILike, IsNull } from 'typeorm';

import { DB_UNIQUE_VIOLATION_ERR_CODE } from '@const/code';
import type { Card } from '@entities/card.entity';
import type {
	CreateCardInput,
	DeleteCardInput,
	GenerateCardInput,
	GetCardInput,
	UpdateCardInput,
} from '@schema/card.schema';
import { cardService } from '@service/card.service';
import { folderService } from '@service/folder.service';
import { UserService } from '@service/user.service';
import { AppError } from '@utils/appError';
import type { NextFunction, Request, Response } from 'express';

import type { ErrorType } from '../types/error';
import { ErrorCode } from '../types/error';
import Container from '../utils/container';

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

const mapGrpcErrorToAppError = (grpcErr: GrpcError): AppError => {
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
				`Could not find requested details via ${serviceName}. ${grpcErr.details ?? ''}`.trim();

			break;
		case grpc.status.INVALID_ARGUMENT:
			statusCode = 400;
			message = `Invalid data sent to ${serviceName}: ${grpcErr.details ?? grpcErr.message}`;

			break;
		case grpc.status.INTERNAL:
			statusCode = 500;
			message =
				`The ${serviceName} encountered an internal error. ${grpcErr.details ?? ''}`.trim();

			break;
		default:
			statusCode = 500;
			message = `${serviceName} error (code ${grpcErr.code}): ${grpcErr.details ?? grpcErr.message}`;

			break;
	}

	return new AppError(ErrorCode.INTERNAL_SERVER_ERROR, message, statusCode, {
		originalError: grpcErr,
	});
};

export const generateCardHandler = (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		GenerateCardInput
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const responseData = await cardService.generateCard(req.body);

			res.status(200).json({
				status: 'success',
				data: responseData,
			});
		} catch (err: unknown) {
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

			next(appError);
		}
	})();
};

export const createCardHandler = (
	req: Request<
		Record<string, string>,
		Record<string, string>,
		CreateCardInput
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const { folderId, ...cardData } = req.body;
			const userId = res.locals['user'].id;

			if (!userId) {
				return next(
					new AppError(
						ErrorCode.UNAUTHORIZED,
						'Authentication required.',
						401
					)
				);
			}

			if (!folderId) {
				return next(
					new AppError(
						ErrorCode.BAD_REQUEST,
						'Folder ID is required for card creation',
						400
					)
				);
			}

			const user = await Container.get(UserService).findById(userId);
			if (!user) {
				return next(
					new AppError(
						ErrorCode.UNAUTHORIZED,
						'Invalid user session.',
						401
					)
				);
			}

			const folder = await folderService.getFolder(folderId);
			if (!folder) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						`Folder with ID ${folderId} not found`,
						404
					)
				);
			}

			const card = await cardService.createCard(cardData, user, folder);

			res.status(201).json({
				status: 'success',
				data: {
					card,
				},
			});
		} catch (err: unknown) {
			const error = err as ErrorType & { code?: string };

			if (error.code === DB_UNIQUE_VIOLATION_ERR_CODE) {
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
	})();
};

export const getCardHandler = (
	req: Request<GetCardInput>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		const cardId = req.params.cardId;

		try {
			const card = await cardService.getCard(cardId);

			if (!card) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						'Card with that ID not found',
						404
					)
				);
			}

			if (card.user.id !== res.locals['user'].id) {
				return next(
					new AppError(ErrorCode.FORBIDDEN, 'Forbidden', 403)
				);
			}

			res.status(200).json({
				status: 'success',
				data: {
					card,
				},
			});
		} catch (err: unknown) {
			next(err);
		}
	})();
};

export const getCardsHandler = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const userId = res.locals['user'].id;

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
			if (query['skip'] && typeof query['skip'] === 'string') {
				skip = parseInt(query['skip'], 10);
				if (isNaN(skip) || skip < 0) {
					skip = 0;
				}
			}

			let take = DEFAULT_TAKE;
			if (query['take'] && typeof query['take'] === 'string') {
				take = parseInt(query['take'], 10);
				if (isNaN(take) || take < 1) {
					take = DEFAULT_TAKE;
				}
				take = Math.min(take, MAX_TAKE_LIMIT);
			}

			let sort: string | undefined = undefined;
			let order: 'ASC' | 'DESC' = 'ASC';

			if (
				query['sort'] &&
				typeof query['sort'] === 'string' &&
				ALLOWED_CARD_SORT_FIELDS.includes(query['sort'] as keyof Card)
			) {
				sort = query['sort'];
				if (
					query['order'] &&
					typeof query['order'] === 'string' &&
					query['order'].toUpperCase() === 'DESC'
				) {
					order = 'DESC';
				}
			}

			const search: string | undefined =
				query['search'] && typeof query['search'] === 'string'
					? query['search'].trim()
					: undefined;
			const folderId: string | undefined =
				query['folderId'] && typeof query['folderId'] === 'string'
					? query['folderId'].trim()
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

			const [cards, totalCount] = await cardService.findCardsWithCount({
				where,
				order: orderOptions,
				skip,
				take,
			});

			res.status(200).json({
				status: 'success',
				data: {
					cards,
				},
				meta: {
					skip,
					take,
					total: totalCount,
					folderId: folderId ?? undefined,
					sort: Object.keys(orderOptions)[0],
					order: Object.values(orderOptions)[0],
				},
			});
		} catch (err: unknown) {
			next(err);
		}
	})();
};

export const updateCardHandler = (
	req: Request<
		UpdateCardInput['params'],
		Record<string, string>,
		UpdateCardInput['body']
	>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const { folderId, ...updateData } = req.body;
			const cardId = req.params.cardId;
			const userId = res.locals['user'].id;

			const card = await cardService.getCard(cardId);

			if (!card) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						'Card with that ID not found',
						404
					)
				);
			}

			if (card.user.id !== userId) {
				return next(
					new AppError(ErrorCode.FORBIDDEN, 'Forbidden', 403)
				);
			}

			let folder;

			if (folderId) {
				folder = await folderService.getFolder(folderId);

				if (!folder) {
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
			}

			const updatedCard = await cardService.update(card.id, {
				...updateData,
				word: updateData.word ?? '',
				translation: updateData.translation ?? '',
				image: updateData.image ?? '',
				sentence: updateData.sentence ?? '',
			});

			res.status(200).json({
				status: 'success',
				data: { card: updatedCard },
			});
		} catch (err: unknown) {
			const error = err as ErrorType & { code?: string };

			if (error.code === DB_UNIQUE_VIOLATION_ERR_CODE) {
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
	})();
};

export const deleteCardHandler = (
	req: Request<DeleteCardInput>,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		const cardId = req.params.cardId;

		try {
			const card = await cardService.getCard(cardId);

			if (!card) {
				return next(
					new AppError(
						ErrorCode.NOT_FOUND,
						'Card with that ID not found',
						404
					)
				);
			}

			await card.remove();

			res.status(204).json({
				status: 'success',
				data: null,
			});
		} catch (err: unknown) {
			next(err);
		}
	})();
};
