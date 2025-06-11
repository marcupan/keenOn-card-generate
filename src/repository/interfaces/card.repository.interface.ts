import type { FindManyOptions, FindOptionsWhere } from 'typeorm';

import type { Card, Folder, User } from '../../entities';

import type { IRepository } from './repository.interface';

/**
 * Card repository interface that defines card-specific operations
 */
export interface ICardRepository extends IRepository<Card> {
	/**
	 * Create a card with user and optional folder
	 * @param data Card data
	 * @param user User who owns the card
	 * @param folder Optional folder to place the card in
	 * @returns Created card
	 */
	createWithRelations(
		data: Partial<Card>,
		user: User,
		folder?: Folder
	): Promise<Card>;

	/**
	 * Get a card by ID with relations
	 * @param cardId Card ID
	 * @returns Found card or null
	 */
	getWithRelations(cardId: string): Promise<Card | null>;

	/**
	 * Count cards with optional filter
	 * @param where Optional filter conditions
	 * @returns Number of cards
	 */
	count(
		where?: FindOptionsWhere<Card> | FindOptionsWhere<Card>[]
	): Promise<number>;

	/**
	 * Find cards with relations and pagination
	 * @param options Find options including where, skip, and take
	 * @returns Found cards
	 */
	findWithRelations(options: FindManyOptions<Card>): Promise<Card[]>;
}
