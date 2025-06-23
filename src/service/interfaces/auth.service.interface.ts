import type { Response } from 'express';

import type { User } from '../../entities';
import type { CreateUserInput, LoginUserInput } from '../../schema/user.schema';

/**
 * Auth service interface that defines authentication operations
 */
export interface IAuthService {
	/**
	 * Register a new user
	 * @param input User registration data
	 * @returns Created user
	 */
	registerUser(input: CreateUserInput): Promise<User>;

	/**
	 * Login a user
	 * @param input User login data
	 * @returns User data and tokens, or a flag indicating 2FA is required
	 */
	loginUser(input: LoginUserInput): Promise<{
		user?: { name: string; email: string };
		access_token?: string;
		refresh_token?: string;
		requiresTwoFactor?: boolean;
		twoFactorToken?: string;
	}>;

	/**
	 * Logout a user
	 * @param userId User ID
	 * @returns Success status
	 */
	logoutUser(userId: string): Promise<boolean>;

	/**
	 * Refresh an access token
	 * @param refreshToken Refresh token
	 * @returns New access token
	 */
	refreshAccessToken(refreshToken: string): Promise<string>;

	/**
	 * Verify a user's email
	 * @param verificationCode Verification code
	 * @returns Success status
	 */
	verifyEmail(verificationCode: string): Promise<boolean>;

	/**
	 * Send a verification email
	 * @param user User to send verification email to
	 * @param verificationCode Verification code
	 * @returns Success status
	 */
	sendVerificationEmail(
		user: User,
		verificationCode: string
	): Promise<boolean>;

	/**
	 * Create a verification code
	 * @returns Verification code and hashed verification code
	 */
	createVerificationCode(): {
		verificationCode: string;
		hashedVerificationCode: string;
	};

	/**
	 * Save a user
	 * @param user User to save
	 * @returns Saved user
	 */
	save(user: User): Promise<User>;

	/**
	 * Set authentication cookies in the response
	 * @param res Express response object
	 * @param access_token Access token
	 * @param refresh_token Refresh token
	 */
	setCookies(
		res: Response,
		access_token: string,
		refresh_token: string
	): void;

	/**
	 * Clear authentication cookies in the response
	 * @param res Express response object
	 */
	clearCookies(res: Response): void;

	/**
	 * Handle the complete user registration flow including email verification
	 * @param input User registration data
	 * @returns Registration result with status and message
	 */
	handleRegistration(input: CreateUserInput): Promise<{
		status: string;
		message: string;
		statusCode: number;
	}>;
}
