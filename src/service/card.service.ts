import { FindManyOptions } from 'typeorm';

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
