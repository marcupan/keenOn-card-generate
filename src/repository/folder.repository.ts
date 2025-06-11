import type { FindManyOptions } from 'typeorm';
import { ILike } from 'typeorm';

import type { User } from '../entities';
import { Folder } from '../entities';
import type { CreateFolderInput } from '../schema/folder.schema';
import { DatabaseError } from '../utils/appError';
import { AppDataSource } from '../utils/dataSource';

import { BaseRepository } from './base.repository';
import type { IFolderRepository } from './interfaces/folder.repository.interface';

/**
 * Folder repository implementation
 */
export class FolderRepository
	extends BaseRepository<Folder>
	implements IFolderRepository
{
	constructor() {
		super(AppDataSource.getRepository(Folder));
	}

	/**
	 * Create a folder with user
	 * @param data Folder data
	 * @param user User who owns the folder
	 * @returns Created folder
	 */
	async createWithUser(data: CreateFolderInput, user: User): Promise<Folder> {
		try {
			const folder = this.repository.create({ ...data, user });
			return await this.repository.save(folder);
		} catch (error) {
			throw new DatabaseError('Failed to create folder with user', {
				error,
				data,
				userId: user.id,
			});
		}
	}

	/**
	 * Get a folder by ID with relations
	 * @param folderId Folder ID
	 * @returns Found folder or null
	 */
	async getWithRelations(folderId: string): Promise<Folder | null> {
		try {
			return await this.repository.findOne({
				where: { id: folderId },
				select: {
					user: {
						id: true,
						name: true,
					},
				},
				relations: ['user', 'cards'],
			});
		} catch (error) {
			throw new DatabaseError('Failed to get folder with relations', {
				error,
				folderId,
			});
		}
	}

	/**
	 * Find folders with search, pagination, and relations
	 * @param options Search and pagination options
	 * @returns Found folders
	 */
	async findWithOptions(
		options: FindManyOptions<Folder> & { search?: string }
	): Promise<Folder[]> {
		try {
			const { search } = options;
			const where = search ? { name: ILike(`%${search}%`) } : {};

			return await this.repository.find({
				...options,
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
			});
		} catch (error) {
			throw new DatabaseError('Failed to find folders with options', {
				error,
				options,
			});
		}
	}
}

export const folderRepository = new FolderRepository();
