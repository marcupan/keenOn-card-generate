import { NextFunction, Request, Response } from 'express';
import { ILike } from 'typeorm';

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

		const { translation, individualTranslations } =
			await translationClient.Translate({
				chineseWord: word,
			});

		if (!imageBase64) {
			return next(new AppError(400, 'Image is required'));
		}

		const { composedImage } = await composeClient.ComposeImage({
			imageBase64,
			text: translation,
			sentences: individualTranslations,
		});

		const composedImageBase64 =
			Buffer.from(composedImage).toString('base64');

		res.status(200).json({
			status: 'success',
			data: {
				image: composedImageBase64,
				translation,
				sentence: individualTranslations,
			},
		});
	} catch (err) {
		next(err);
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

		if (res.locals.user.id) {
			const user = await findUserById(res.locals.user.id);

			if (user) {
				let folder;

				if (folderId) {
					folder = await getFolder(folderId);

					if (!folder) {
						return next(
							new AppError(404, 'Folder with that ID not found')
						);
					}
				}

				const card = await createCard(cardData, user, folder);

				res.status(201).json({
					status: 'success',
					data: {
						card,
					},
				});
			}
		}
	} catch (err: unknown) {
		const error = err as ErrorType;

		if (error.code === DB_UNIQUE_VIOLATION_ERR_CODE) {
			return res.status(409).json({
				status: 'fail',
				message: 'Card with that title already exist',
			});
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
		const card = await getCard(req.params.cardId);

		if (!card) {
			return next(new AppError(404, 'Card with that ID not found'));
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

		const where = search
			? [
					{
						word: ILike(`%${search}%`),
					},
				]
			: {};

		const orderOptions = sort
			? {
					[sort as keyof Card]:
						order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
				}
			: undefined;

		const cards = await findCards({
			where,
			select,
			relations,
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
				sort,
				order,
			},
		});
	} catch (err: unknown) {
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

		const card = await getCard(req.params.cardId);

		if (!card) {
			return next(new AppError(404, 'Card with that ID not found'));
		}

		if (folderId) {
			const folder = await getFolder(folderId);

			if (!folder) {
				return next(new AppError(404, 'Folder with that ID not found'));
			}

			card.folder = folder;
		}

		Object.assign(card, updateData);

		const updatedCard = await card.save();

		res.status(200).json({
			status: 'success',
			data: { card: updatedCard },
		});
	} catch (err: unknown) {
		next(err);
	}
};

export const deleteCardHandler = async (
	req: Request<DeleteCardInput>,
	res: Response,
	next: NextFunction
) => {
	try {
		const card = await getCard(req.params.cardId);

		if (!card) {
			return next(new AppError(404, 'Card with that ID not found'));
		}

		await card.remove();

		res.status(204).json({
			status: 'success',
			data: null,
		});
	} catch (err: unknown) {
		next(err);
	}
};
