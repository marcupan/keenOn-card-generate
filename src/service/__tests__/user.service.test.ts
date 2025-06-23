import bcrypt from 'bcrypt';

import { UserService } from '../user.service';
import { RoleEnumType } from '../../types/role';

import redisClient from '../../utils/connectRedis';
import { User } from '../../entities';
import { userRepository } from '../../repository/user.repository';
import { DatabaseError, NotFoundError } from '../../utils/appError';
import { signJwt } from '../../utils/jwt';

// Mock dependencies
jest.mock('@repository/user.repository');
jest.mock('@utils/cacheService');
jest.mock('@utils/jwt');
jest.mock('../../utils/connectRedis');
jest.mock('bcrypt');
jest.mock('../../utils/container');
jest.mock('crypto');

// Mock config module
jest.mock('config', () => ({
	get: jest.fn((key: string) => {
		const configValues: Record<string, number | string> = {
			accessTokenExpiresIn: 15,
			refreshTokenExpiresIn: 60,
			redisCacheExpiresIn: 60,
		};
		return configValues[key] || '';
	}),
}));

describe('UserService', () => {
	let userService: UserService;
	let mockUser: Partial<User>;

	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();

		// Create a mock user
		mockUser = {
			id: '1',
			name: 'Test User',
			email: 'test@example.com',
			password: 'hashedPassword',
			verified: true,
			role: RoleEnumType.USER,
			created_at: new Date(),
			updated_at: new Date(),
			verificationCode: null,
		};

		// Create the service instance
		userService = new UserService();
	});

	describe('create', () => {
		it('should create a user successfully', async () => {
			// Arrange
			const userData = {
				name: 'New User',
				email: 'new@example.com',
				password: 'password123',
			};
			const createdUser = { ...userData, id: '2' } as User;
			(userRepository.create as jest.Mock).mockResolvedValue(createdUser);

			// Act
			const result = await userService.create(userData);

			// Assert
			expect(result).toEqual(createdUser);
			expect(userRepository.create).toHaveBeenCalledWith(userData);
		});

		it('should throw DatabaseError if creation fails', async () => {
			// Arrange
			const userData = {
				name: 'New User',
				email: 'new@example.com',
				password: 'password123',
			};
			const error = new Error('Database error');
			(userRepository.create as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(userService.create(userData)).rejects.toThrow(
				DatabaseError
			);
			expect(userRepository.create).toHaveBeenCalledWith(userData);
		});
	});

	describe('findById', () => {
		it('should find a user by ID successfully', async () => {
			// Arrange
			const userId = '1';
			(userRepository.findById as jest.Mock).mockResolvedValue(mockUser);

			// Act
			const result = await userService.findById(userId);

			// Assert
			expect(result).toEqual(mockUser);
			expect(userRepository.findById).toHaveBeenCalledWith(userId);
		});

		it('should return null if user is not found', async () => {
			// Arrange
			const userId = 'nonexistent';
			(userRepository.findById as jest.Mock).mockResolvedValue(null);

			// Act
			const result = await userService.findById(userId);

			// Assert
			expect(result).toBeNull();
			expect(userRepository.findById).toHaveBeenCalledWith(userId);
		});

		it('should throw DatabaseError if findById fails', async () => {
			// Arrange
			const userId = '1';
			const error = new Error('Database error');
			(userRepository.findById as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(userService.findById(userId)).rejects.toThrow(
				DatabaseError
			);
			expect(userRepository.findById).toHaveBeenCalledWith(userId);
		});
	});

	describe('findByEmail', () => {
		it('should find a user by email successfully', async () => {
			// Arrange
			const email = 'test@example.com';
			(userRepository.findByEmail as jest.Mock).mockResolvedValue(
				mockUser
			);

			// Act
			const result = await userService.findByEmail(email);

			// Assert
			expect(result).toEqual(mockUser);
			expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
		});

		it('should return null if user is not found by email', async () => {
			// Arrange
			const email = 'nonexistent@example.com';
			(userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

			// Act
			const result = await userService.findByEmail(email);

			// Assert
			expect(result).toBeNull();
			expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
		});

		it('should throw DatabaseError if findByEmail fails', async () => {
			// Arrange
			const email = 'test@example.com';
			const error = new Error('Database error');
			(userRepository.findByEmail as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(userService.findByEmail(email)).rejects.toThrow(
				DatabaseError
			);
			expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
		});
	});

	describe('update', () => {
		it('should update a user successfully', async () => {
			// Arrange
			const userId = '1';
			const updateData = { name: 'Updated Name' };
			const updatedUser = { ...mockUser, ...updateData };
			(userRepository.update as jest.Mock).mockResolvedValue(updatedUser);

			// Act
			const result = await userService.update(userId, updateData);

			// Assert
			expect(result).toEqual(updatedUser);
			expect(userRepository.update).toHaveBeenCalledWith(
				userId,
				updateData
			);
		});

		it('should throw NotFoundError if user is not found during update', async () => {
			// Arrange
			const userId = 'nonexistent';
			const updateData = { name: 'Updated Name' };
			const error = new NotFoundError('User not found');
			(userRepository.update as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(
				userService.update(userId, updateData)
			).rejects.toThrow(NotFoundError);
			expect(userRepository.update).toHaveBeenCalledWith(
				userId,
				updateData
			);
		});

		it('should throw DatabaseError for other errors during update', async () => {
			// Arrange
			const userId = '1';
			const updateData = { name: 'Updated Name' };
			const error = new Error('Database error');
			(userRepository.update as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(
				userService.update(userId, updateData)
			).rejects.toThrow(DatabaseError);
			expect(userRepository.update).toHaveBeenCalledWith(
				userId,
				updateData
			);
		});
	});

	describe('signTokens', () => {
		it('should sign tokens successfully', async () => {
			// Arrange
			const user = mockUser as User;
			const tokens = {
				access_token: 'access-token',
				refresh_token: 'refresh-token',
			};
			(redisClient.set as jest.Mock).mockResolvedValue('OK');
			(signJwt as jest.Mock)
				.mockReturnValueOnce(tokens.access_token)
				.mockReturnValueOnce(tokens.refresh_token);

			// Act
			const result = await userService.signTokens(user);

			// Assert
			expect(result).toEqual(tokens);
			expect(redisClient.set).toHaveBeenCalledWith(
				user.id,
				JSON.stringify(user),
				expect.any(Object)
			);
			expect(signJwt).toHaveBeenCalledTimes(2);
		});

		it('should throw DatabaseError if signing tokens fails', async () => {
			// Arrange
			const user = mockUser as User;
			const error = new Error('Redis error');
			(redisClient.set as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(userService.signTokens(user)).rejects.toThrow(
				DatabaseError
			);
			expect(redisClient.set).toHaveBeenCalledWith(
				user.id,
				JSON.stringify(user),
				expect.any(Object)
			);
		});
	});

	describe('comparePasswords', () => {
		it('should return true if passwords match', async () => {
			// Arrange
			const candidatePassword = 'password123';
			const hashedPassword = 'hashedPassword';
			(bcrypt.compare as jest.Mock).mockResolvedValue(true);

			// Act
			const result = await userService.comparePasswords(
				candidatePassword,
				hashedPassword
			);

			// Assert
			expect(result).toBe(true);
			expect(bcrypt.compare).toHaveBeenCalledWith(
				candidatePassword,
				hashedPassword
			);
		});

		it('should return false if passwords do not match', async () => {
			// Arrange
			const candidatePassword = 'wrongPassword';
			const hashedPassword = 'hashedPassword';
			(bcrypt.compare as jest.Mock).mockResolvedValue(false);

			// Act
			const result = await userService.comparePasswords(
				candidatePassword,
				hashedPassword
			);

			// Assert
			expect(result).toBe(false);
			expect(bcrypt.compare).toHaveBeenCalledWith(
				candidatePassword,
				hashedPassword
			);
		});

		it('should throw DatabaseError if comparing passwords fails', async () => {
			// Arrange
			const candidatePassword = 'password123';
			const hashedPassword = 'hashedPassword';
			const error = new Error('Bcrypt error');
			(bcrypt.compare as jest.Mock).mockRejectedValue(error);

			// Act & Assert
			await expect(
				userService.comparePasswords(candidatePassword, hashedPassword)
			).rejects.toThrow(DatabaseError);
			expect(bcrypt.compare).toHaveBeenCalledWith(
				candidatePassword,
				hashedPassword
			);
		});
	});

	// Add more tests for other methods as needed
});
