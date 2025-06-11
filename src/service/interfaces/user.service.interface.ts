import type { FindManyOptions } from 'typeorm';

import type { User } from '../../entities';

import type { IService } from './service.interface';

/**
 * User service interface that defines user-specific operations
 */
export interface IUserService extends IService<User> {
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
	findUsers(options: FindManyOptions<User>): Promise<User[]>;

	/**
	 * Sign JWT tokens for a user
	 * @param user User to sign tokens for
	 * @returns Access and refresh tokens
	 */
	signTokens(
		user: User
	): Promise<{ access_token: string; refresh_token: string }>;

	/**
	 * Create a verification code for a user
	 * @returns Verification code and hashed verification code
	 */
	createVerificationCode(): {
		verificationCode: string;
		hashedVerificationCode: string;
	};

	/**
	 * Compare a password with a hashed password
	 * @param candidatePassword Password to compare
	 * @param hashedPassword Hashed password to compare against
	 * @returns Whether the passwords match
	 */
	comparePasswords(
		candidatePassword: string,
		hashedPassword: string
	): Promise<boolean>;

	/**
	 * Save a user entity
	 * @param user User to save
	 * @returns Saved user
	 */
	save(user: User): Promise<User>;
}
