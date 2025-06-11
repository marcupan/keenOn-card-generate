import type { TypeOf } from 'zod';
import z from 'zod';

export const generateCardSchema = z.object({
	body: z.object({
		word: z.string({
			required_error: 'Word is required',
		}),
		imageBase64: z.string({
			required_error: 'Image base64 is required',
		}),
	}),
});

export const createCardSchema = z.object({
	body: z.object({
		word: z.string({
			required_error: 'Word is required',
		}),
		translation: z.string({
			required_error: 'Translation is required',
		}),
		image: z.string({
			required_error: 'Image URL is required',
		}),
		sentence: z.string({
			required_error: 'Sentence is required',
		}),
		folderId: z.string().uuid('Invalid folder ID format'),
	}),
});

const params = {
	params: z.object({
		cardId: z.string().uuid('Invalid card ID format'),
	}),
};

export const getCardSchema = z.object({
	...params,
});

const cardKeys = z.union([
	z.literal('id'),
	z.literal('word'),
	z.literal('translation'),
	z.literal('image'),
	z.literal('sentence'),
	z.literal('user'),
	z.literal('folder'),
]);

export const getCardsSchema = z.object({
	query: z.object({
		search: z.string().optional(),
		select: z.array(cardKeys).optional(),
		relations: z.object({
			user: z.boolean().optional(),
			folder: z.boolean().optional(),
		}),
		sort: z.string().optional(),
		order: z.string().optional(),
		skip: z.number().optional(),
		take: z.number().optional(),
	}),
});

export const updateCardSchema = z.object({
	...params,
	body: z.object({
		word: z.string().optional(),
		translation: z.string().optional(),
		image: z.string().optional(),
		sentence: z.string().optional(),
		folderId: z.string().uuid().optional(),
	}),
});

export const deleteCardSchema = z.object({
	...params,
});

export type GenerateCardInput = TypeOf<typeof generateCardSchema>['body'];
export type CreateCardInput = TypeOf<typeof createCardSchema>['body'];
export type GetCardInput = TypeOf<typeof getCardSchema>['params'];
export type GetCardsInput = TypeOf<typeof getCardsSchema>['query'];
export type UpdateCardInput = TypeOf<typeof updateCardSchema>;
export type DeleteCardInput = TypeOf<typeof deleteCardSchema>['params'];
