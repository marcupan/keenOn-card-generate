import type { FindManyOptions } from 'typeorm';

import { User } from '../entities';
import { DatabaseError } from '../utils/appError';
import { AppDataSource } from '../utils/dataSource';

import { BaseRepository } from './base.repository';
import type { IUserRepository } from './interfaces/user.repository.interface';

/**
 * User repository implementation
 */
export class UserRepository
	extends BaseRepository<User>
	implements IUserRepository
{
	constructor() {
		super(AppDataSource.getRepository(User));
	}

	/**
	 * Find a user by email
	 * @param email User email
	 * @returns Found user or null
	 */
	async findByEmail(email: string): Promise<User | null> {
		try {
			return await this.findOneBy({ email });
		} catch (error) {
			throw new DatabaseError('Failed to find user by email', {
				error,
				email,
			});
		}
	}

	/**
	 * Find users with pagination and relations
	 * @param options Find options including skip and take for pagination
	 * @returns Found users
	 */
	async findUsersWithDetails(
		options: FindManyOptions<User>
	): Promise<User[]> {
		try {
			return await this.repository.find({
				...options,
				select: {
					id: true,
					name: true,
					email: true,
					verified: true,
					role: true,
					folders: {
						id: true,
						name: true,
					},
				},
				relations: ['folders'],
			});
		} catch (error) {
			throw new DatabaseError('Failed to find users with details', {
				error,
				options,
			});
		}
	}

	/**
	 * Find users with pagination, relations, and count
	 * @param options Find options including skip and take for pagination
	 * @param search Optional search term for filtering users by name or email
	 * @returns Tuple of [users, count]
	 */
	async findUsersWithDetailsAndCount(
		options: FindManyOptions<User>,
		search?: string
	): Promise<[User[], number]> {
		try {
			const queryBuilder = this.repository
				.createQueryBuilder('user')
				.leftJoinAndSelect('user.folders', 'folder')
				.select([
					'user.id',
					'user.name',
					'user.email',
					'user.verified',
					'user.role',
					'folder.id',
					'folder.name',
				])
				.skip(options.skip)
				.take(options.take);

			if (search) {
				queryBuilder.where(
					'user.name ILIKE :search OR user.email ILIKE :search',
					{ search: `%${search}%` }
				);
			}

			return await queryBuilder.getManyAndCount();
		} catch (error) {
			throw new DatabaseError(
				'Failed to find users with details and count',
				{
					error,
					options,
					search,
				}
			);
		}
	}
}

// Create a singleton instance of the user repository
export const userRepository = new UserRepository();
