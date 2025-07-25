import type {
	CreateFolderInput,
	UpdateFolderInput,
} from '@schema/folder.schema';

import type { Folder, User } from '../../entities';

import type { IService } from './service.interface';

/**
 * Folder service interface that defines folder-specific operations
 */
export interface IFolderService extends IService<Folder> {
	/**
	 * Create a folder with user relation
	 * @param input Folder data
	 * @param user User who owns the folder
	 * @returns Created folder
	 */
	createFolder(input: CreateFolderInput, user: User): Promise<Folder>;

	/**
	 * Get a folder by ID with relations
	 * @param folderId Folder ID
	 * @returns Found folder or null
	 */
	getFolder(folderId: string): Promise<Folder | null>;

	/**
	 * Find folders with search and pagination
	 * @param options Search and pagination options
	 * @returns Found folders
	 */
	findFolders(options: {
		search?: string;
		skip?: number;
		take?: number;
	}): Promise<Folder[]>;

	/**
	 * Update a folder
	 * @param folder Folder to update
	 * @returns Updated folder
	 */
	updateFolder(folder: Folder): Promise<Folder>;

	/**
	 * Delete a folder
	 * @param folder Folder to delete
	 */
	deleteFolder(folder: Folder): Promise<void>;

	/**
	 * Find a folder by ID, throw error if not found
	 * @param folderId Folder ID
	 * @returns Found folder
	 * @throws AppError if folder not found
	 */
	getFolderOrFail(folderId: string): Promise<Folder>;

	/**
	 * Update a folder by ID with provided data
	 * @param folderId Folder ID
	 * @param data Update data
	 * @returns Updated folder
	 * @throws AppError if folder not found
	 */
	updateFolderById(
		folderId: string,
		data: UpdateFolderInput['body']
	): Promise<Folder>;

	/**
	 * Delete a folder by ID
	 * @param folderId Folder ID
	 * @throws AppError if folder not found
	 */
	deleteFolderById(folderId: string): Promise<void>;
}
