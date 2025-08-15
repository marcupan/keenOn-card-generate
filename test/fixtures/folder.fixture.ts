import { Folder } from '../../src/entities/folder.entity';
import { User } from '../../src/entities/user.entity';
import { AppDataSource } from '../../src/utils/dataSource';
import { UserFixture } from './user.fixture';

/**
 * Folder fixture for creating test folders
 */
export class FolderFixture {
	/**
	 * Create a folder with default values
	 * @param user - The user who owns the folder
	 * @param overrides - Optional properties to override default values
	 * @returns A folder entity instance
	 */
	static createFolder(user: User, overrides: Partial<Folder> = {}): Folder {
		const folder = new Folder();
		folder.name = overrides.name || 'Test Folder';
		folder.description = overrides.description || 'This is a test folder';
		folder.user = user;

		return folder;
	}

	/**
	 * Create and save a folder to the database
	 * @param user - The user who owns the folder
	 * @param overrides - Optional properties to override default values
	 * @returns A saved folder entity
	 */
	static async createAndSaveFolder(
		user: User,
		overrides: Partial<Folder> = {}
	): Promise<Folder> {
		const folder = FolderFixture.createFolder(user, overrides);
		const folderRepository = AppDataSource.getRepository(Folder);

		return await folderRepository.save(folder);
	}

	/**
	 * Create multiple folders with default values
	 * @param user - The user who owns the folders
	 * @param count - Number of folders to create
	 * @param overrides - Optional properties to override default values
	 * @returns An array of folder entity instances
	 */
	static createFolders(
		user: User,
		count: number,
		overrides: Partial<Folder> = {}
	): Folder[] {
		return Array.from({ length: count }, (_, index) =>
			FolderFixture.createFolder(user, {
				...overrides,
				name: overrides.name
					? `${overrides.name} ${index + 1}`
					: `Test Folder ${index + 1}`,
			})
		);
	}

	/**
	 * Create and save multiple folders to the database
	 * @param user - The user who owns the folders
	 * @param count - Number of folders to create
	 * @param overrides - Optional properties to override default values
	 * @returns An array of saved folder entities
	 */
	static async createAndSaveFolders(
		user: User,
		count: number,
		overrides: Partial<Folder> = {}
	): Promise<Folder[]> {
		const folders = FolderFixture.createFolders(user, count, overrides);
		const folderRepository = AppDataSource.getRepository(Folder);

		return await folderRepository.save(folders);
	}

	/**
	 * Create a folder with a new user
	 * @param userOverrides - Optional properties to override default user values
	 * @param folderOverrides - Optional properties to override default folder values
	 * @returns An object containing the created user and folder
	 */
	static async createFolderWithNewUser(
		userOverrides: Partial<User> = {},
		folderOverrides: Partial<Folder> = {}
	): Promise<{ user: User; folder: Folder }> {
		const user = await UserFixture.createAndSaveUser(userOverrides);
		const folder = await FolderFixture.createAndSaveFolder(
			user,
			folderOverrides
		);

		return { user, folder };
	}

	/**
	 * Create multiple folders with a new user
	 * @param count - Number of folders to create
	 * @param userOverrides - Optional properties to override default user values
	 * @param folderOverrides - Optional properties to override default folder values
	 * @returns An object containing the created user and folders
	 */
	static async createFoldersWithNewUser(
		count: number,
		userOverrides: Partial<User> = {},
		folderOverrides: Partial<Folder> = {}
	): Promise<{ user: User; folders: Folder[] }> {
		const user = await UserFixture.createAndSaveUser(userOverrides);
		const folders = await FolderFixture.createAndSaveFolders(
			user,
			count,
			folderOverrides
		);

		return { user, folders };
	}
}
