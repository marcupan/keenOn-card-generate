import { ILike } from 'typeorm';

import { Folder } from '../entities/folder.entity';
import { User } from '../entities/user.entity';
import { CreateFolderInput } from '../schema/folder.schema';

export const createFolder = async (
	input: CreateFolderInput,
	user: User
): Promise<Folder> => {
	const folder = Folder.create({ ...input, user });

	return folder.save();
};

export const getFolder = async (folderId: string): Promise<Folder | null> => {
	return Folder.findOne({
		where: { id: folderId },
		select: {
			user: {
				id: true,
				name: true,
			},
		},
		relations: ['user', 'cards'],
	});
};

export const findFolders = async (options: {
	search?: string;
	skip?: number;
	take?: number;
}): Promise<Folder[]> => {
	const { search, skip, take } = options;

	const where = search ? { name: ILike(`%${search}%`) } : {};

	return Folder.find({
		where,
		select: {
			user: {
				id: true,
			},
			cards: {
				id: true,
				word: true,
			},
		},
		relations: ['user', 'cards'],
		skip,
		take,
	});
};

export const updateFolder = async (folder: Folder): Promise<Folder> => {
	return folder.save();
};

export const deleteFolder = async (folder: Folder): Promise<void> => {
	await folder.remove();
};
