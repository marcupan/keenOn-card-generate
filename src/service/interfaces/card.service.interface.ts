import type { FindManyOptions, FindOptionsWhere } from 'typeorm';

import type { Card, Folder, User } from '../../entities';
import type { GenerateCardInput } from '../../schema/card.schema';

import type { IService } from './service.interface';

/**
 * Card service interface that defines card-specific operations
 */
export interface ICardService extends IService<Card> {
	/**
	 * Create a card with user and optional folder
	 * @param data Card data
	 * @param user User who owns the card
	 * @param folder Optional folder to place the card in
	 * @returns Created card
	 */
	createCard(data: Partial<Card>, user: User, folder?: Folder): Promise<Card>;

	/**
	 * Get a card by ID with relations
	 * @param cardId Card ID
	 * @returns Found card or null
	 */
	getCard(cardId: string): Promise<Card | null>;

	/**
	 * Count cards with optional filter
	 * @param where Optional filter conditions
	 * @returns Number of cards
	 */
	countCards(
		where?: FindOptionsWhere<Card> | FindOptionsWhere<Card>[]
	): Promise<number>;

	/**
	 * Find cards with relations and pagination
	 * @param options Find options including where, skip, and take
	 * @returns Found cards
	 */
	findCards(options: FindManyOptions<Card>): Promise<Card[]>;

	/**
	 * Generate a card with translation and image composition
	 * @param input Card generation data including word and imageBase64
	 * @returns Generated card data including image, translation, characterBreakdown, and exampleSentences
	 */
	generateCard(input: GenerateCardInput): Promise<{
		image: string;
		translation: string | null;
		characterBreakdown: string[];
		exampleSentences: string[];
	}>;
}
