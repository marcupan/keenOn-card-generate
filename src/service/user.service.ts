import * as crypto from 'crypto';

import bcrypt from 'bcrypt';
import config from 'config';
import { Service } from 'typedi';
import { DeepPartial, FindManyOptions } from 'typeorm';

import { User } from '@entities/user.entity';
import { userRepository } from '@repository/user.repository';
import { DatabaseError, NotFoundError } from '@utils/appError';
import { cacheService, CacheTTL } from '@utils/cacheService';
import { signJwt } from '@utils/jwt';

import redisClient from '../utils/connectRedis';
import Container from '../utils/container';

import { IUserService } from './interfaces/user.service.interface';

/**
 * User service implementation
 */
@Service()
export class UserService implements IUserService {
	/**
	 * Create a new user
	 * @param data User data
	 * @returns Created user
	 */
	async create(data: DeepPartial<User>): Promise<User> {
		try {
			return await userRepository.create(data);
		} catch (err: unknown) {
			const dbError = {
				message: err instanceof Error ? err.message : 'Unknown error',
				detail: (err as { detail?: string })?.detail,
				code: (err as { code?: string })?.code,
			};

			throw new DatabaseError('Failed to create user', { dbError });
		}
	}

	/**
	 * Find a user by ID
	 * @param id User ID
	 * @returns Found user or null
	 */
	async findById(id: string): Promise<User | null> {
		try {
			return await userRepository.findById(id);
		} catch (error) {
			throw new DatabaseError('Failed to find user by ID', { error, id });
		}
	}

	/**
	 * Find one user by criteria
	 * @param criteria Search criteria
	 * @returns Found user or null
	 */
	async findOne(criteria: Record<string, unknown>): Promise<User | null> {
		try {
			return await userRepository.findOneBy(criteria);
		} catch (error) {
			throw new DatabaseError('Failed to find user by criteria', {
				error,
				criteria,
			});
		}
	}

	/**
	 * Find a user by email
	 * @param email User email
	 * @returns Found user or null
	 */
	async findByEmail(email: string): Promise<User | null> {
		try {
			return await userRepository.findByEmail(email);
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
	async findUsers(options: FindManyOptions<User>): Promise<User[]> {
		try {
			return await userRepository.findUsersWithDetails(options);
		} catch (error) {
			throw new DatabaseError('Failed to find users with details', {
				error,
				options,
			});
		}
	}

	/**
	 * Find users with pagination, relations, and count
	 * @param options Object containing skip, take, and optional search parameters
	 * @returns Tuple of [users, count]
	 */
	async findUsersWithCount(options: {
		skip: number;
		take: number;
		search?: string;
	}): Promise<[User[], number]> {
		try {
			const { skip, take, search } = options;

			const cacheKey = `users:list:${skip}:${take}:${search ?? 'all'}`;

			return await cacheService.getOrSet<[User[], number]>(
				cacheKey,
				() => {
					return userRepository.findUsersWithDetailsAndCount(
						{ skip, take },
						search
					);
				},
				CacheTTL.MEDIUM
			);
		} catch (error) {
			throw new DatabaseError('Failed to find users with count', {
				error,
				options,
			});
		}
	}

	/**
	 * Update a user
	 * @param id User ID
	 * @param data User data
	 * @returns Updated user
	 */
	async update(id: string, data: DeepPartial<User>): Promise<User> {
		try {
			return await userRepository.update(id, data);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}
			throw new DatabaseError('Failed to update user', {
				error,
				id,
				data,
			});
		}
	}

	/**
	 * Delete a user
	 * @param id User ID
	 * @returns Deletion result
	 */
	async delete(id: string): Promise<boolean> {
		try {
			return await userRepository.delete(id);
		} catch (error) {
			throw new DatabaseError('Failed to delete user', { error, id });
		}
	}

	/**
	 * Sign JWT tokens for a user
	 * @param user User to sign tokens for
	 * @returns Access and refresh tokens
	 */
	async signTokens(
		user: User
	): Promise<{ access_token: string; refresh_token: string }> {
		try {
			await redisClient.set(user.id, JSON.stringify(user), {
				EX: config.get<number>('redisCacheExpiresIn') * 60,
			});

			const access_token = signJwt(
				{ sub: user.id },
				'accessTokenPrivateKey',
				{
					expiresIn: `${config.get<number>('accessTokenExpiresIn')}m`,
				}
			);

			const refresh_token = signJwt(
				{ sub: user.id },
				'refreshTokenPrivateKey',
				{
					expiresIn: `${config.get<number>('refreshTokenExpiresIn')}m`,
				}
			);

			return { access_token, refresh_token };
		} catch (error) {
			throw new DatabaseError('Failed to sign tokens', {
				error,
				userId: user.id,
			});
		}
	}

	/**
	 * Create a verification code for a user
	 * @returns Verification code and hashed verification code
	 */
	createVerificationCode(): {
		verificationCode: string;
		hashedVerificationCode: string;
	} {
		try {
			const verificationCode = crypto.randomBytes(32).toString('hex');

			const hashedVerificationCode = crypto
				.createHash('sha256')
				.update(verificationCode)
				.digest('hex');

			return { verificationCode, hashedVerificationCode };
		} catch (error) {
			throw new DatabaseError('Failed to create verification code', {
				error,
			});
		}
	}

	/**
	 * Compare a password with a hashed password
	 * @param candidatePassword Password to compare
	 * @param hashedPassword Hashed password to compare against
	 * @returns Whether the passwords match
	 */
	async comparePasswords(
		candidatePassword: string,
		hashedPassword: string
	): Promise<boolean> {
		try {
			return await bcrypt.compare(candidatePassword, hashedPassword);
		} catch (error) {
			throw new DatabaseError('Failed to compare passwords', { error });
		}
	}

	/**
	 * Save a user entity
	 * @param user User to save
	 * @returns Saved user
	 */
	async save(user: User): Promise<User> {
		try {
			return await userRepository.save(user);
		} catch (error) {
			throw new DatabaseError('Failed to save user', {
				error,
				userId: user.id,
			});
		}
	}
}

// Only create the singleton instance if not in test environment
export const userService =
	process.env['NODE_ENV'] !== 'test'
		? Container.get(UserService)
		: (undefined as unknown as UserService);
