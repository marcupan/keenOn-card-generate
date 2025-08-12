import { Response } from 'express';
import { IAuthService } from '../../src/service/interfaces/auth.service.interface';
import { User } from '../../src/entities';
import { CreateUserInput, LoginUserInput } from '../../src/schema/user.schema';
import { RoleEnumType } from '../../src/types/role';
import { AppError } from '../../src/utils/appError';
import { ErrorCode } from '../../src/types/error';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Creates a mock AuthService that implements the IAuthService interface
 * @returns A mock AuthService implementation
 */
export function createMockAuthService(): jest.Mocked<IAuthService> {
	const users: User[] = [];
	const refreshTokens: Map<string, string> = new Map();

	const mockAuthService: jest.Mocked<IAuthService> = {
		registerUser: jest.fn(async (input: CreateUserInput): Promise<User> => {
			const existingUser = users.find(
				(user) => user.email === input.email
			);
			if (existingUser) {
				throw new AppError(
					ErrorCode.CONFLICT,
					'User with that email already exists',
					409
				);
			}

			const user = new User();
			user.id = `mock-id-${Date.now()}`;
			user.name = input.name;
			user.email = input.email;
			// Hash password for more realistic testing
			user.password = await bcrypt.hash(input.password, 12);
			user.role = input.role || RoleEnumType.USER;
			user.verified = false;
			user.verificationCode = null;
			user.twoFactorEnabled = false;
			user.twoFactorSecret = null;
			user.created_at = new Date();
			user.updated_at = new Date();

			users.push(user);

			return user;
		}),

		loginUser: jest.fn(async (input: LoginUserInput) => {
			const user = users.find((user) => user.email === input.email);

			if (!user) {
				throw new AppError(
					ErrorCode.UNAUTHORIZED,
					'Invalid email or password',
					401
				);
			}

			// Compare hashed passwords
			const isPasswordValid = await bcrypt.compare(
				input.password,
				user.password
			);
			if (!isPasswordValid) {
				throw new AppError(
					ErrorCode.UNAUTHORIZED,
					'Invalid email or password',
					401
				);
			}

			if (user.twoFactorEnabled) {
				return {
					requiresTwoFactor: true,
					twoFactorToken: `mock-2fa-token-${user.id}`,
				};
			}

			const access_token = `mock-access-token-${user.id}`;
			const refresh_token = `mock-refresh-token-${user.id}`;

			refreshTokens.set(refresh_token, user.id);

			return {
				user: {
					name: user.name,
					email: user.email,
				},
				access_token,
				refresh_token,
			};
		}),

		logoutUser: jest.fn(async (userId: string): Promise<boolean> => {
			for (const [token, id] of refreshTokens.entries()) {
				if (id === userId) {
					refreshTokens.delete(token);
				}
			}

			return true;
		}),

		refreshAccessToken: jest.fn(
			async (refreshToken: string): Promise<string> => {
				const userId = refreshTokens.get(refreshToken);
				if (!userId) {
					throw new AppError(
						ErrorCode.UNAUTHORIZED,
						'Invalid refresh token',
						401
					);
				}

				return `mock-access-token-${userId}-refreshed`;
			}
		),

		verifyEmail: jest.fn(
			async (verificationCode: string): Promise<boolean> => {
				// Hash the provided verification code to compare with a stored hashed version
				const hashedVerificationCode = crypto
					.createHash('sha256')
					.update(verificationCode)
					.digest('hex');

				const user = users.find(
					(user) => user.verificationCode === hashedVerificationCode
				);

				if (!user) {
					throw new AppError(
						ErrorCode.BAD_REQUEST,
						'Invalid verification code',
						400
					);
				}

				user.verified = true;
				user.verificationCode = null;
				user.updated_at = new Date();

				return true;
			}
		),

		sendVerificationEmail: jest.fn(
			async (
				_user: User,
				_verificationCode: string
			): Promise<boolean> => {
				return true;
			}
		),

		createVerificationCode: jest.fn(() => {
			const verificationCode = crypto.randomBytes(32).toString('hex');
			const hashedVerificationCode = crypto
				.createHash('sha256')
				.update(verificationCode)
				.digest('hex');

			return { verificationCode, hashedVerificationCode };
		}),

		save: jest.fn(async (user: User): Promise<User> => {
			const index = users.findIndex((u) => u.id === user.id);

			if (index === -1) {
				users.push(user);
			} else {
				const existingUser = users[index]!;
				Object.assign(existingUser, user, { updated_at: new Date() });
			}

			return user;
		}),

		setCookies: jest.fn(
			(
				_res: Response,
				_access_token: string,
				_refresh_token: string
			): void => {}
		),

		clearCookies: jest.fn((_res: Response): void => {}),

		handleRegistration: jest.fn(async (input: CreateUserInput) => {
			try {
				const user = await mockAuthService.registerUser(input);

				const { verificationCode, hashedVerificationCode } =
					mockAuthService.createVerificationCode();

				user.verificationCode = hashedVerificationCode;
				await mockAuthService.save(user);

				await mockAuthService.sendVerificationEmail(
					user,
					verificationCode
				);

				return {
					status: 'success',
					message:
						'Registration successful. Please check your email to verify your account.',
					statusCode: 201,
				};
			} catch (error) {
				if (error instanceof AppError) {
					return {
						status: 'error',
						message: error.message,
						statusCode: error.statusCode,
					};
				}

				return {
					status: 'error',
					message: (error as Error).message,
					statusCode: 500,
				};
			}
		}),
	};

	return mockAuthService;
}
