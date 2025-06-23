import * as crypto from 'crypto';

import config from 'config';
import { Service, Inject } from 'typedi';

import { DB_UNIQUE_VIOLATION_ERR_CODE } from '@const/code';
import { CreateUserInput, LoginUserInput } from '@schema/user.schema';
import { AppError, ConflictError } from '@utils/appError';
import { verifyJwt } from '@utils/jwt';
import { CookieOptions, Response } from 'express';

import { User } from '../entities';
import { ErrorCode } from '../types/error';
import redisClient from '../utils/connectRedis';
import Container from '../utils/container';
import Email from '../utils/email';

import { IAuthService } from './interfaces/auth.service.interface';
import { IUserService } from './interfaces/user.service.interface';
import { ITwoFactorService } from './interfaces/twoFactor.service.interface';
import { UserService } from './user.service';
import { TwoFactorService } from './twoFactor.service';
import { signJwt } from '@utils/jwt';

interface DatabaseError {
	dbError?: {
		code?: string;
		detail?: string;
		message?: string;
	};
	message?: string;
}

/**
 * Auth service implementation
 */
@Service()
export class AuthService implements IAuthService {
	private readonly accessTokenCookieOptions: CookieOptions;
	private readonly refreshTokenCookieOptions: CookieOptions;

	constructor(
		@Inject(() => UserService) private userService: IUserService,
		@Inject(() => TwoFactorService)
		private twoFactorService: ITwoFactorService
	) {
		const cookiesOptions: CookieOptions = {
			httpOnly: true,
			sameSite: 'lax',
		};

		if (process.env['NODE_ENV'] === 'production') {
			cookiesOptions.secure = true;
		}

		this.accessTokenCookieOptions = {
			...cookiesOptions,
			expires: new Date(
				Date.now() +
					config.get<number>('accessTokenExpiresIn') * 60 * 1000
			),
			maxAge: config.get<number>('accessTokenExpiresIn') * 60 * 1000,
		};

		this.refreshTokenCookieOptions = {
			...cookiesOptions,
			expires: new Date(
				Date.now() +
					config.get<number>('refreshTokenExpiresIn') * 60 * 1000
			),
			maxAge: config.get<number>('refreshTokenExpiresIn') * 60 * 1000,
		};
	}

	/**
	 * Generate a token for two-factor authentication
	 * @param userId User ID
	 * @returns JWT token containing the user ID
	 */
	private generateTwoFactorToken(userId: string): string {
		return signJwt({ sub: userId }, 'accessTokenPrivateKey', {
			expiresIn: '5m', // Short expiration for 2FA token
		});
	}

	/**
	 * Verify a two-factor token and complete the login process
	 * @param twoFactorToken Token from the first login step
	 * @param verificationCode Verification code from the user's authenticator app
	 * @returns User data and tokens
	 */
	async verifyTwoFactorLogin(
		twoFactorToken: string,
		verificationCode: string
	): Promise<{
		user: { name: string; email: string };
		access_token: string;
		refresh_token: string;
	}> {
		// Verify the two-factor token
		const decoded = verifyJwt<{ sub: string }>(
			twoFactorToken,
			'accessTokenPublicKey'
		);

		if (!decoded) {
			throw new AppError(
				ErrorCode.UNAUTHORIZED,
				'Invalid or expired token',
				401
			);
		}

		const userId = decoded.sub;

		// Get the user
		const user = await this.userService.findById(userId);
		if (!user) {
			throw new AppError(ErrorCode.NOT_FOUND, 'User not found', 404);
		}

		// Verify the 2FA code
		const { verified } = await this.twoFactorService.verify(
			userId,
			verificationCode
		);

		if (!verified) {
			throw new AppError(
				ErrorCode.UNAUTHORIZED,
				'Invalid verification code',
				401
			);
		}

		// Generate tokens
		const { access_token, refresh_token } =
			await this.userService.signTokens(user);

		return {
			user: {
				name: user.name,
				email: user.email,
			},
			access_token,
			refresh_token,
		};
	}

	/**
	 * Register a new user
	 * @param input User registration data
	 * @returns Created user
	 */
	async registerUser(input: CreateUserInput): Promise<User> {
		const { hashedVerificationCode } =
			this.userService.createVerificationCode();

		const payload = {
			name: input.name,
			email: input.email.toLowerCase(),
			password: input.password,
			verificationCode: hashedVerificationCode,
			verified: false,
		};

		return this.userService.create(payload);
	}

	/**
	 * Login a user
	 * @param input User login data
	 * @returns User data and tokens, or a flag indicating 2FA is required
	 */
	async loginUser(input: LoginUserInput): Promise<{
		user?: { name: string; email: string };
		access_token?: string;
		refresh_token?: string;
		requiresTwoFactor?: boolean;
		twoFactorToken?: string;
	}> {
		const { email, password } = input;

		const user = await this.userService.findByEmail(email);

		if (!user) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'Invalid email or password',
				400
			);
		}

		if (!user.verified) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'You are not verified',
				400
			);
		}

		if (
			!(await this.userService.comparePasswords(password, user.password))
		) {
			throw new AppError(
				ErrorCode.BAD_REQUEST,
				'Invalid email or password',
				400
			);
		}

		// Check if user has 2FA enabled
		if (user.twoFactorEnabled) {
			// Generate a special token for 2FA verification
			const twoFactorToken = this.generateTwoFactorToken(user.id);

			return {
				requiresTwoFactor: true,
				twoFactorToken,
			};
		}

		// If 2FA is not enabled, proceed with normal login
		const { access_token, refresh_token } =
			await this.userService.signTokens(user);

		return {
			user: {
				name: user.name,
				email: user.email,
			},
			access_token,
			refresh_token,
		};
	}

	/**
	 * Logout a user
	 * @param userId User ID
	 * @returns Success status
	 */
	async logoutUser(userId: string): Promise<boolean> {
		await redisClient.del(userId);
		return true;
	}

	/**
	 * Refresh an access token
	 * @param refreshToken Refresh token
	 * @returns New access token
	 */
	async refreshAccessToken(refreshToken: string): Promise<string> {
		const message = 'Could not refresh access token';

		if (!refreshToken) {
			throw new AppError(ErrorCode.FORBIDDEN, message, 403);
		}

		const decoded = verifyJwt<{ sub: string }>(
			refreshToken,
			'refreshTokenPublicKey'
		);

		if (!decoded) {
			throw new AppError(ErrorCode.FORBIDDEN, message, 403);
		}

		const session = await redisClient.get(decoded.sub);

		if (!session) {
			throw new AppError(ErrorCode.FORBIDDEN, message, 403);
		}

		const user = await this.userService.findById(JSON.parse(session).id);

		if (!user) {
			throw new AppError(ErrorCode.FORBIDDEN, message, 403);
		}

		const { access_token } = await this.userService.signTokens(user);
		return access_token;
	}

	/**
	 * Verify a user's email
	 * @param verificationCode Verification code
	 * @returns Success status
	 */
	async verifyEmail(verificationCode: string): Promise<boolean> {
		const hashedVerificationCode = crypto
			.createHash('sha256')
			.update(verificationCode)
			.digest('hex');

		const user = await this.userService.findOne({
			verificationCode: hashedVerificationCode,
		});

		if (!user) {
			throw new AppError(
				ErrorCode.UNAUTHORIZED,
				'Could not verify email',
				401
			);
		}

		user.verified = true;
		user.verificationCode = null;

		await this.userService.save(user);
		return true;
	}

	/**
	 * Send a verification email
	 * @param user User to send verification email to
	 * @param verificationCode Verification code
	 * @returns Success status
	 */
	async sendVerificationEmail(
		user: User,
		verificationCode: string
	): Promise<boolean> {
		const emailVerificationUrl = `${config.get<string>(
			'origin'
		)}/verifyemail/${verificationCode}`;

		try {
			const emailInstance = new Email(user, emailVerificationUrl);

			await emailInstance.sendVerificationCode();

			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get cookie options
	 * @returns Cookie options
	 */
	getCookieOptions(): {
		accessTokenCookieOptions: CookieOptions;
		refreshTokenCookieOptions: CookieOptions;
	} {
		return {
			accessTokenCookieOptions: this.accessTokenCookieOptions,
			refreshTokenCookieOptions: this.refreshTokenCookieOptions,
		};
	}

	/**
	 * Create a verification code
	 * @returns Verification code and hashed verification code
	 */
	createVerificationCode(): {
		verificationCode: string;
		hashedVerificationCode: string;
	} {
		return this.userService.createVerificationCode();
	}

	/**
	 * Save a user
	 * @param user User to save
	 * @returns Saved user
	 */
	save(user: User): Promise<User> {
		return this.userService.save(user);
	}

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
	): void {
		const { accessTokenCookieOptions, refreshTokenCookieOptions } =
			this.getCookieOptions();

		res.cookie('access_token', access_token, accessTokenCookieOptions);
		res.cookie('refresh_token', refresh_token, refreshTokenCookieOptions);
		res.cookie('logged_in', true, {
			...accessTokenCookieOptions,
			httpOnly: false,
		});
	}

	/**
	 * Clear authentication cookies in the response
	 * @param res Express response object
	 */
	clearCookies(res: Response): void {
		res.cookie('access_token', '', { maxAge: -1 });
		res.cookie('refresh_token', '', { maxAge: -1 });
		res.cookie('logged_in', '', { maxAge: -1 });
	}

	/**
	 * Handle the complete user registration flow including email verification
	 * @param input User registration data
	 * @returns Registration result with status and message
	 */
	public async handleRegistration(input: CreateUserInput): Promise<{
		status: string;
		message: string;
		statusCode: number;
	}> {
		const { verificationCode: raw, hashedVerificationCode } =
			this.userService.createVerificationCode();

		let newUser: User;
		try {
			newUser = await this.userService.create({
				name: input.name,
				email: input.email.toLowerCase(),
				password: input.password,
				verificationCode: hashedVerificationCode,
				verified: false,
			});
		} catch (err: unknown) {
			if (
				(err as DatabaseError).dbError?.code ===
				DB_UNIQUE_VIOLATION_ERR_CODE
			) {
				throw new ConflictError('User with that email already exists');
			}

			throw new AppError(
				ErrorCode.INTERNAL_SERVER_ERROR,
				'Failed to create user',
				500,
				{ originalError: err }
			);
		}

		const sent = await this.sendVerificationEmail(newUser, raw);
		if (!sent) {
			newUser.verificationCode = null;
			await this.userService.save(newUser);
			return {
				status: 'error',
				message: 'Could not send verification email; please try again.',
				statusCode: 500,
			};
		}

		return {
			status: 'success',
			message: 'Registration successful! Check your email.',
			statusCode: 201,
		};
	}
}

// Only create the singleton instance if not in test environment
export const authService =
	process.env['NODE_ENV'] !== 'test'
		? Container.get(AuthService)
		: (undefined as unknown as AuthService);
