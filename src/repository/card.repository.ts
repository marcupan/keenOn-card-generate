import type { DeepPartial, FindManyOptions, FindOptionsWhere } from 'typeorm';

import type { Folder, User } from '../entities';
import { Card } from '../entities';
import { DatabaseError } from '../utils/appError';
import { AppDataSource } from '../utils/dataSource';

import { BaseRepository } from './base.repository';
import type { ICardRepository } from './interfaces/card.repository.interface';

/**
 * Card repository implementation
 */
export class CardRepository
	extends BaseRepository<Card>
	implements ICardRepository
{
	constructor() {
		super(AppDataSource.getRepository(Card));
	}

	/**
	 * Create a card with user and optional folder
	 * @param data Card data
	 * @param user User who owns the card
	 * @param folder Optional folder to place the card in
	 * @returns Created card
	 */
	async createWithRelations(
		data: DeepPartial<Omit<Card, 'user' | 'folder'>>,
		user: User,
		folder?: Folder
	): Promise<Card> {
		try {
			const card = this.repository.create();
			Object.assign(card, data);
			card.user = user;
			if (folder) {
				card.folder = folder;
			}
			return await this.repository.save(card);
		} catch (error) {
			throw new DatabaseError('Failed to create card with relations', {
				error,
				data,
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
	async getWithRelations(cardId: string): Promise<Card | null> {
		try {
			return await this.repository.findOne({
				where: { id: cardId },
				select: {
					user: {
						id: true,
					},
					folder: {
						id: true,
					},
				},
				relations: ['user', 'folder'],
			});
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
	async count(
		where?: FindOptionsWhere<Card> | FindOptionsWhere<Card>[]
	): Promise<number> {
		try {
			return await this.repository.count({
				where: where ?? {},
			});
		} catch (error) {
			throw new DatabaseError('Failed to count cards', {
				error,
				where,
			});
		}
	}

	/**
	 * Find cards with relations and pagination
	 * @param options Find options including where, skip, and take
	 * @returns Found cards
	 */
	async findWithRelations(options: FindManyOptions<Card>): Promise<Card[]> {
		try {
			return await this.repository.find({
				...options,
				relations: ['user', 'folder'],
			});
		} catch (error) {
			throw new DatabaseError('Failed to find cards with relations', {
				error,
				options,
			});
		}
	}
}

export const cardRepository = new CardRepository();
