import { AuthService } from '../auth.service';
import { UserService } from '../user.service';
import { TwoFactorService } from '../twoFactor.service';
import { Container } from 'typedi';

import { ErrorCode } from '../../types/error';
import redisClient from '../../utils/connectRedis';
import { User } from '../../entities';
import { ITwoFactorService } from '../interfaces/twoFactor.service.interface';
import { AppError } from '../../utils/appError';

// Mock dependencies
jest.mock('../user.service');
jest.mock('../twoFactor.service');
jest.mock('../../utils/connectRedis');
jest.mock('../../utils/jwt');
jest.mock('../../utils/email');

// Mock config module
jest.mock('config', () => ({
	get: jest.fn((key: string) => {
		const configValues: Record<string, number | string> = {
			accessTokenExpiresIn: 15,
			refreshTokenExpiresIn: 60,
			origin: 'http://localhost:3000',
		};
		return configValues[key] || '';
	}),
}));

describe('AuthService', () => {
	let authService: AuthService;
	let userService: jest.Mocked<UserService>;
	let twoFactorService: jest.Mocked<ITwoFactorService>;

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();

		// Create mock instances
		userService = {
			create: jest.fn(),
			findByEmail: jest.fn(),
			findById: jest.fn(),
			findOne: jest.fn(),
			save: jest.fn(),
			comparePasswords: jest.fn(),
			signTokens: jest.fn(),
			createVerificationCode: jest.fn(),
		} as unknown as jest.Mocked<UserService>;

		twoFactorService = {
			generateSecret: jest.fn(),
			verifyAndEnable: jest.fn(),
			verify: jest.fn(),
			disable: jest.fn(),
		} as unknown as jest.Mocked<ITwoFactorService>;

		// Mock Container.get to return our mock services
		jest.spyOn(Container, 'get').mockImplementation((service) => {
			if (service === UserService) return userService;
			if (service === TwoFactorService) return twoFactorService;
			return undefined;
		});

		// Create the service instance
		authService = new AuthService(userService, twoFactorService);
	});

	describe('loginUser', () => {
		it('should throw an error if user is not found', async () => {
			// Arrange
			const loginInput = {
				email: 'test@example.com',
				password: 'password123',
			};
			userService.findByEmail.mockResolvedValue(null);

			// Act & Assert
			await expect(authService.loginUser(loginInput)).rejects.toThrow(
				new AppError(
					ErrorCode.BAD_REQUEST,
					'Invalid email or password',
					400
				)
			);
			expect(userService.findByEmail).toHaveBeenCalledWith(
				loginInput.email
			);
		});

		it('should throw an error if user is not verified', async () => {
			// Arrange
			const loginInput = {
				email: 'test@example.com',
				password: 'password123',
			};
			const mockUser = {
				id: '1',
				name: 'Test User',
				email: 'test@example.com',
				password: 'hashedPassword',
				verified: false,
				role: 'user',
				folders: [],
				cards: [],
				hashPassword: jest.fn(),
				comparePassword: jest.fn(),
				created_at: new Date(),
				updated_at: new Date(),
				verificationCode: null,
			} as unknown as User;
			userService.findByEmail.mockResolvedValue(mockUser);

			// Act & Assert
			await expect(authService.loginUser(loginInput)).rejects.toThrow(
				new AppError(ErrorCode.BAD_REQUEST, 'You are not verified', 400)
			);
		});

		it('should throw an error if password is incorrect', async () => {
			// Arrange
			const loginInput = {
				email: 'test@example.com',
				password: 'wrongPassword',
			};
			const mockUser = {
				id: '1',
				name: 'Test User',
				email: 'test@example.com',
				password: 'hashedPassword',
				verified: true,
				role: 'user',
				folders: [],
				cards: [],
				hashPassword: jest.fn(),
				comparePassword: jest.fn(),
				created_at: new Date(),
				updated_at: new Date(),
				verificationCode: null,
			} as unknown as User;
			userService.findByEmail.mockResolvedValue(mockUser);
			userService.comparePasswords.mockResolvedValue(false);

			// Act & Assert
			await expect(authService.loginUser(loginInput)).rejects.toThrow(
				new AppError(
					ErrorCode.BAD_REQUEST,
					'Invalid email or password',
					400
				)
			);
			expect(userService.comparePasswords).toHaveBeenCalledWith(
				loginInput.password,
				mockUser.password
			);
		});

		it('should return user data and tokens if login is successful', async () => {
			// Arrange
			const loginInput = {
				email: 'test@example.com',
				password: 'password123',
			};
			const mockUser = {
				id: '1',
				name: 'Test User',
				email: 'test@example.com',
				password: 'hashedPassword',
				verified: true,
				role: 'user',
				folders: [],
				cards: [],
				hashPassword: jest.fn(),
				comparePassword: jest.fn(),
				created_at: new Date(),
				updated_at: new Date(),
				verificationCode: null,
			} as unknown as User;
			const mockTokens = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
			};

			userService.findByEmail.mockResolvedValue(mockUser);
			userService.comparePasswords.mockResolvedValue(true);
			userService.signTokens.mockResolvedValue(mockTokens);

			// Act
			const result = await authService.loginUser(loginInput);

			// Assert
			expect(result).toEqual({
				user: {
					name: mockUser.name,
					email: mockUser.email,
				},
				access_token: mockTokens.access_token,
				refresh_token: mockTokens.refresh_token,
			});
			expect(userService.signTokens).toHaveBeenCalledWith(mockUser);
		});
	});

	describe('logoutUser', () => {
		it('should delete the user session from Redis and return true', async () => {
			// Arrange
			const userId = '1';
			const redisMock = redisClient as jest.Mocked<typeof redisClient>;
			redisMock.del.mockResolvedValue(1);

			// Act
			const result = await authService.logoutUser(userId);

			// Assert
			expect(result).toBe(true);
			expect(redisMock.del).toHaveBeenCalledWith(userId);
		});
	});

	// Add more test cases for other methods as needed
});
