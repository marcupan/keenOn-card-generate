import * as grpc from '@grpc/grpc-js';
import { Service } from 'typedi';
import { DeepPartial, FindManyOptions, FindOptionsWhere } from 'typeorm';

import { cardRepository } from '@repository/card.repository';
import { GenerateCardInput } from '@schema/card.schema';
import { AppError, DatabaseError, NotFoundError } from '@utils/appError';
import { cacheService, CacheTTL } from '@utils/cacheService';

import { Card, Folder, User } from '../entities';
import { ErrorCode } from '../types/error';
import composeClient from '../utils/composeClient';
import Container from '../utils/container';
import translationClient from '../utils/translationClient';

import { ICardService } from './interfaces/card.service.interface';

/**
 * Card service implementation
 */
@Service()
export class CardService implements ICardService {
	/**
	 * Create a new card
	 * @param data Card data
	 * @returns Created card
	 */
	async create(data: DeepPartial<Card>): Promise<Card> {
		try {
			return await cardRepository.create(data);
		} catch (error) {
			throw new DatabaseError('Failed to create card', { error });
		}
	}

	/**
	 * Find a card by ID
	 * @param id Card ID
	 * @returns Found card or null
	 */
	async findById(id: string): Promise<Card | null> {
		try {
			return await cardRepository.findById(id);
		} catch (error) {
			throw new DatabaseError('Failed to find card by ID', { error, id });
		}
	}

	/**
	 * Find one card by criteria
	 * @param criteria Search criteria
	 * @returns Found card or null
	 */
	async findOne(criteria: FindOptionsWhere<Card>): Promise<Card | null> {
		try {
			return await cardRepository.findOneBy(criteria);
		} catch (error) {
			throw new DatabaseError('Failed to find card by criteria', {
				error,
				criteria,
			});
		}
	}

	/**
	 * Update a card
	 * @param id Card ID
	 * @param data Card data
	 * @returns Updated card
	 */
	async update(id: string, data: Partial<Card>): Promise<Card> {
		try {
			return await cardRepository.update(id, data);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}
			throw new DatabaseError('Failed to update card', {
				error,
				id,
				data,
			});
		}
	}

	/**
	 * Delete a card
	 * @param id Card ID
	 * @returns Deletion result
	 */
	async delete(id: string): Promise<boolean> {
		try {
			return await cardRepository.delete(id);
		} catch (error) {
			throw new DatabaseError('Failed to delete card', { error, id });
		}
	}

	/**
	 * Create a card with user and optional folder
	 * @param data Card data
	 * @param user User who owns the card
	 * @param folder Optional folder to place the card in
	 * @returns Created card
	 */
	async createCard(
		data: Partial<Card>,
		user: User,
		folder?: Folder
	): Promise<Card> {
		try {
			return await cardRepository.createWithRelations(data, user, folder);
		} catch (error) {
			throw new DatabaseError('Failed to create card with relations', {
				error,
				userId: user.id,
				folderId: folder?.id,
			});
		}
	}

	/**
	 * Get a card by ID with relations
	 * @param cardId Card ID
	 * @returns Found card or null
	 */
	async getCard(cardId: string): Promise<Card | null> {
		try {
			return await cardRepository.getWithRelations(cardId);
		} catch (error) {
			throw new DatabaseError('Failed to get card with relations', {
				error,
				cardId,
			});
		}
	}

	/**
	 * Count cards with optional filter
	 * @param where Optional filter conditions
	 * @returns Number of cards
	 */
	async countCards(
		where?: FindOptionsWhere<Card> | FindOptionsWhere<Card>[]
	): Promise<number> {
		try {
			return await cardRepository.count(where);
		} catch (error) {
			throw new DatabaseError('Failed to count cards', { error });
		}
	}

	/**
	 * Find cards with relations and pagination
	 * @param options Find options including where, skip, and take
	 * @returns Found cards
	 */
	async findCards(options: FindManyOptions<Card>): Promise<Card[]> {
		try {
			const cacheKey = `cards:list:${JSON.stringify(options)}`;

			return await cacheService.getOrSet<Card[]>(
				cacheKey,
				async () => {
					return cardRepository.findWithRelations(options);
				},
				CacheTTL.MEDIUM
			);
		} catch (error) {
			throw new DatabaseError('Failed to find cards with relations', {
				error,
				options,
			});
		}
	}

	/**
	 * Find cards with relations, pagination, and count
	 * @param options Find options including where, skip, and take
	 * @returns Tuple of [cards, count]
	 */
	async findCardsWithCount(
		options: FindManyOptions<Card>
	): Promise<[Card[], number]> {
		try {
			const cacheKey = `cards:list:count:${JSON.stringify(options)}`;

			return await cacheService.getOrSet<[Card[], number]>(
				cacheKey,
				async () => {
					const cards =
						await cardRepository.findWithRelations(options);
					const count = await this.countCards(options.where);
					return [cards, count];
				},
				CacheTTL.MEDIUM
			);
		} catch (error) {
			throw new DatabaseError('Failed to find cards with count', {
				error,
				options,
			});
		}
	}

	/**
	 * Generate a card with translation and image composition
	 * @param input Card generation data including word and imageBase64
	 * @returns Generated card data including image, translation, characterBreakdown, and exampleSentences
	 */
	async generateCard(input: GenerateCardInput): Promise<{
		image: string;
		translation: string | null;
		characterBreakdown: string[];
		exampleSentences: string[];
	}> {
		const { word, imageBase64 } = input;

		if (!word) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'Chinese word is required',
				400
			);
		}

		if (
			!imageBase64 ||
			typeof imageBase64 !== 'string' ||
			!imageBase64.startsWith('data:image')
		) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'Valid base64 image data is required',
				400
			);
		}

		const rawImageBase64 = imageBase64.includes(',')
			? imageBase64.split(',')[1]
			: imageBase64;

		if (!rawImageBase64) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'Invalid base64 image data format provided.',
				400
			);
		}

		let translationResponse;

		try {
			translationResponse = await translationClient.Translate({
				chineseWord: word,
			});
		} catch (err) {
			if (isGrpcError(err) && err.code === grpc.status.NOT_FOUND) {
				throw new AppError(
					ErrorCode.NOT_FOUND,
					`Translation service could not find the word: "${word}"`,
					404
				);
			}

			throw err;
		}

		const { translation, individualTranslations, exampleSentences } =
			translationResponse;

		const composeResponse = await composeClient.ComposeImage({
			imageBase64: rawImageBase64,
			translation: translation || '',
			individualTranslations: individualTranslations || [],
			exampleSentences: exampleSentences || [],
		});

		const { composedImage } = composeResponse;

		if (!composedImage || composedImage.length === 0) {
			throw new AppError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				'Image composition service failed to produce an image.',
				500
			);
		}

		const composedImageBase64 =
			Buffer.from(composedImage).toString('base64');

		return {
			image: `data:image/png;base64,${composedImageBase64}`,
			translation: translation || null,
			characterBreakdown: individualTranslations || [],
			exampleSentences: exampleSentences || [],
		};
	}
}

export const cardService = Container.get(CardService);

/**
 * Check if an error is a gRPC error
 * @param error Error to check
 * @returns Whether the error is a gRPC error
 */
function isGrpcError(error: unknown): error is grpc.ServiceError {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		typeof (error as grpc.ServiceError).code === 'number'
	);
}
