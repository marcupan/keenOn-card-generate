import type { FindManyOptions } from 'typeorm';

import type { User } from '../../entities';

import type { IRepository } from './repository.interface';

/**
 * User repository interface that defines user-specific operations
 */
export interface IUserRepository extends IRepository<User> {
	/**
	 * Find a user by email
	 * @param email User email
	 * @returns Found user or null
	 */
	findByEmail(email: string): Promise<User | null>;

	/**
	 * Find users with pagination and relations
	 * @param options Find options including skip and take for pagination
	 * @returns Found users
	 */
	findUsersWithDetails(options: FindManyOptions<User>): Promise<User[]>;

	/**
	 * Find users with pagination, relations, and count
	 * @param options Find options including skip and take for pagination
	 * @param search Optional search term for filtering users by name or email
	 * @returns Tuple of [users, count]
	 */
	findUsersWithDetailsAndCount(
		options: FindManyOptions<User>,
		search?: string
	): Promise<[User[], number]>;
}
