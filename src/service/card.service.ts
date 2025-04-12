import { FindManyOptions, FindOptionsWhere } from 'typeorm';

import { Card } from '../entities';
import { Folder } from '../entities';
import { User } from '../entities';
import { AppDataSource } from '../utils/dataSource';

const cardRepository = AppDataSource.getRepository(Card);

export const createCard = async (
	input: Partial<Card>,
	user: User,
	folder?: Folder
) => {
	const card = cardRepository.create({ ...input, user, folder });

	return await cardRepository.save(card);
};

export const getCard = async (cardId: string) => {
	return await cardRepository.findOne({
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
};

export const countCards = async (
	where?: FindOptionsWhere<Card> | FindOptionsWhere<Card>[]
): Promise<number> => {
	try {
		console.log('[Service:countCards] Counting cards with filter:', where);

		const count = await cardRepository.count({ where });

		console.log(`[Service:countCards] Count result: ${count}`);

		return count;
	} catch (error) {
		console.error('[Service:countCards] Error counting cards:', error);

		throw new Error('Failed to count cards in database.');
	}
};

export const findCards = async ({
	where,
	skip,
	take,
}: FindManyOptions<Card>) => {
	return await cardRepository.find({
		where,
		select: {
			user: {
				id: true,
			},
			folder: {
				id: true,
				name: true,
			},
		},
		relations: ['user', 'folder'],
		skip,
		take,
	});
};
