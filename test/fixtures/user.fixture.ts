import { User } from '../../src/entities/user.entity';
import { RoleEnumType } from '../../src/types/role';
import { AppDataSource } from '../../src/utils/dataSource';

/**
 * User fixture for creating test users
 */
export class UserFixture {
	/**
	 * Create a user with default values
	 * @param overrides - Optional properties to override default values
	 * @returns A user entity instance
	 */
	static createUser(overrides: Partial<User> = {}): User {
		const user = new User();
		user.name = overrides.name || 'Test User';
		user.email = overrides.email || 'test@example.com';
		user.password = overrides.password || 'Password123!';
		user.role = overrides.role || RoleEnumType.USER;
		user.verified = overrides.verified ?? false;
		user.verificationCode = overrides.verificationCode || null;
		user.twoFactorSecret = overrides.twoFactorSecret || null;
		user.twoFactorEnabled = overrides.twoFactorEnabled ?? false;

		return user;
	}

	/**
	 * Create and save a user to the database
	 * @param overrides - Optional properties to override default values
	 * @returns A saved user entity
	 */
	static async createAndSaveUser(
		overrides: Partial<User> = {}
	): Promise<User> {
		const user = UserFixture.createUser(overrides);
		const userRepository = AppDataSource.getRepository(User);

		return await userRepository.save(user);
	}

	/**
	 * Create multiple users with default values
	 * @param count - Number of users to create
	 * @param overrides - Optional properties to override default values
	 * @returns An array of user entity instances
	 */
	static createUsers(count: number, overrides: Partial<User> = {}): User[] {
		return Array.from({ length: count }, (_, index) =>
			UserFixture.createUser({
				...overrides,
				email: overrides.email
					? `${index + 1}_${overrides.email}`
					: `test${index + 1}@example.com`,
			})
		);
	}

	/**
	 * Create and save multiple users to the database
	 * @param count - Number of users to create
	 * @param overrides - Optional properties to override default values
	 * @returns An array of saved user entities
	 */
	static async createAndSaveUsers(
		count: number,
		overrides: Partial<User> = {}
	): Promise<User[]> {
		const users = UserFixture.createUsers(count, overrides);
		const userRepository = AppDataSource.getRepository(User);

		return await userRepository.save(users);
	}

	/**
	 * Create an admin user
	 * @param overrides - Optional properties to override default values
	 * @returns An admin user entity instance
	 */
	static createAdminUser(overrides: Partial<User> = {}): User {
		return UserFixture.createUser({
			...overrides,
			role: RoleEnumType.ADMIN,
			email: overrides.email || 'admin@example.com',
		});
	}

	/**
	 * Create and save an admin user to the database
	 * @param overrides - Optional properties to override default values
	 * @returns A saved admin user entity
	 */
	static async createAndSaveAdminUser(
		overrides: Partial<User> = {}
	): Promise<User> {
		const adminUser = UserFixture.createAdminUser(overrides);
		const userRepository = AppDataSource.getRepository(User);
		
		return await userRepository.save(adminUser);
	}
}
