import { Service } from 'typedi';
import { DeepPartial, FindManyOptions, ILike } from 'typeorm';

import { CreateFolderInput, UpdateFolderInput } from '@schema/folder.schema';
import { AppError, DatabaseError, NotFoundError } from '@utils/appError';
import { cacheService, CacheTTL } from '@utils/cacheService';

import { Folder, User } from '../entities';
import { ErrorCode } from '../types/error';
import Container from '../utils/container';

import { IFolderService } from './interfaces/folder.service.interface';

interface FolderCriteria {
	id?: string;
	name?: string;
	description?: string;
	user?: { id: string };
}

/**
 * Folder service implementation
 */
@Service()
export class FolderService implements IFolderService {
	/**
	 * Create a new entity
	 * @param data Entity data
	 * @returns Created entity
	 */
	async create(data: DeepPartial<Folder>): Promise<Folder> {
		try {
			const folder = Folder.create(data);
			return await folder.save();
		} catch (error) {
			throw new DatabaseError('Failed to create folder', { error });
		}
	}

	/**
	 * Find an entity by ID
	 * @param id Entity ID
	 * @returns Found entity or null
	 */
	async findById(id: string): Promise<Folder | null> {
		try {
			return await Folder.findOneBy({ id });
		} catch (error) {
			throw new DatabaseError('Failed to find folder by ID', {
				error,
				id,
			});
		}
	}

	/**
	 * Find one entity by criteria
	 * @param criteria Search criteria
	 * @returns Found entity or null
	 */
	async findOne(criteria: Partial<FolderCriteria>): Promise<Folder | null> {
		try {
			return await Folder.findOneBy(criteria);
		} catch (error) {
			throw new DatabaseError('Failed to find folder by criteria', {
				error,
				criteria,
			});
		}
	}

	/**
	 * Update an entity
	 * @param id Entity ID
	 * @param data Entity data
	 * @returns Updated entity
	 */
	async update(id: string, data: DeepPartial<Folder>): Promise<Folder> {
		try {
			await Folder.update(id, data);
			const folder = await this.findById(id);
			if (!folder) {
				throw new NotFoundError(`Folder with ID ${id} not found`);
			}
			return folder;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}
			throw new DatabaseError('Failed to update folder', {
				error,
				id,
				data,
			});
		}
	}

	/**
	 * Delete an entity
	 * @param id Entity ID
	 * @returns Deletion result
	 */
	async delete(id: string): Promise<boolean> {
		try {
			const result = await Folder.delete(id);
			return result.affected ? result.affected > 0 : false;
		} catch (error) {
			throw new DatabaseError('Failed to delete folder', { error, id });
		}
	}

	/**
	 * Create a folder with user relation
	 * @param input Folder data
	 * @param user User who owns the folder
	 * @returns Created folder
	 */
	async createFolder(input: CreateFolderInput, user: User): Promise<Folder> {
		try {
			const folder = await Folder.create({
				...input,
				user,
			}).save();

			await cacheService.deletePattern(`folders:list:${user.id}:*`);

			return folder;
		} catch (error) {
			throw new DatabaseError('Failed to create folder', {
				error,
				input,
			});
		}
	}

	/**
	 * Get a folder by ID with relations
	 * @param folderId Folder ID
	 * @returns Found folder or null
	 */
	async getFolder(folderId: string): Promise<Folder | null> {
		try {
			return await Folder.findOne({
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
	 * Find folders with search and pagination
	 * @param options Search and pagination options
	 * @returns Found folders
	 */
	async findFolders(
		options: FindManyOptions<Folder> & { search?: string }
	): Promise<Folder[]> {
		try {
			const { search } = options;

			const where = search ? { name: ILike(`%${search}%`) } : {};

			return await Folder.find({
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
			throw new DatabaseError('Failed to find folders', {
				error,
				options,
			});
		}
	}

	/**
	 * Find folders with search, pagination, and count
	 * @param options Search and pagination options
	 * @returns Tuple of [folders, count]
	 */
	async findFoldersWithCount(
		options: FindManyOptions<Folder> & {
			search?: string;
			userId: string;
		}
	): Promise<[Folder[], number]> {
		try {
			const { search, skip, take, userId } = options;

			const cacheKey = `folders:list:${userId}:${skip}:${take}:${search ?? 'all'}`;

			return await cacheService.getOrSet<[Folder[], number]>(
				cacheKey,
				async () => {
					const where = {
						...(search ? { name: ILike(`%${search}%`) } : {}),
						user: { id: userId },
					};

					const findParams = {
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
					};

					if (skip) {
						findParams.skip = skip;
					}

					if (take) {
						findParams.take = take;
					}

					return Folder.findAndCount(findParams);
				},
				CacheTTL.MEDIUM
			);
		} catch (error) {
			throw new DatabaseError('Failed to find folders with count', {
				error,
				options,
			});
		}
	}

	/**
	 * Update a folder
	 * @param folder Folder to update
	 * @returns Updated folder
	 */
	async updateFolder(folder: Folder): Promise<Folder> {
		try {
			return await folder.save();
		} catch (error) {
			throw new DatabaseError('Failed to update folder', {
				error,
				folderId: folder.id,
			});
		}
	}

	/**
	 * Delete a folder
	 * @param folder Folder to delete
	 */
	async deleteFolder(folder: Folder): Promise<void> {
		try {
			await folder.remove();
		} catch (error) {
			throw new DatabaseError('Failed to delete folder', {
				error,
				folderId: folder.id,
			});
		}
	}

	/**
	 * Find a folder by ID, throw error if not found
	 * @param folderId Folder ID
	 * @returns Found folder
	 * @throws AppError if folder not found
	 */
	async getFolderOrFail(folderId: string): Promise<Folder> {
		const folder = await this.getFolder(folderId);

		if (!folder) {
			throw new AppError(
				ErrorCode.NOT_FOUND,
				'Folder with that ID not found',
				404
			);
		}

		return folder;
	}

	/**
	 * Update a folder by ID with provided data
	 * @param folderId Folder ID
	 * @param data Update data
	 * @returns Updated folder
	 * @throws AppError if folder not found
	 */
	async updateFolderById(
		folderId: string,
		data: UpdateFolderInput['body']
	): Promise<Folder> {
		const folder = await this.getFolderOrFail(folderId);

		Object.assign(folder, data);

		return this.updateFolder(folder);
	}

	/**
	 * Delete a folder by ID
	 * @param folderId Folder ID
	 * @throws AppError if folder not found
	 */
	async deleteFolderById(folderId: string): Promise<void> {
		const folder = await this.getFolderOrFail(folderId);

		await this.deleteFolder(folder);
	}
}

export const folderService = Container.get(FolderService);
