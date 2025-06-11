import type { Folder, User } from '../../entities';
import type { CreateFolderInput } from '../../schema/folder.schema';

import type { IRepository } from './repository.interface';

/**
 * Folder repository interface that defines folder-specific operations
 */
export interface IFolderRepository extends IRepository<Folder> {
	/**
	 * Create a folder with user
	 * @param data Folder data
	 * @param user User who owns the folder
	 * @returns Created folder
	 */
	createWithUser(data: CreateFolderInput, user: User): Promise<Folder>;

	/**
	 * Get a folder by ID with relations
	 * @param folderId Folder ID
	 * @returns Found folder or null
	 */
	getWithRelations(folderId: string): Promise<Folder | null>;

	/**
	 * Find folders with search, pagination, and relations
	 * @param options Search and pagination options
	 * @returns Found folders
	 */
	findWithOptions(options: {
		search?: string;
		skip?: number;
		take?: number;
	}): Promise<Folder[]>;
}
