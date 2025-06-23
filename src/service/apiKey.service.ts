import { randomBytes, createHash } from 'crypto';
import { Service } from 'typedi';

import { apiKeyRepository } from '@repository/apiKey.repository';
import { userRepository } from '@repository/user.repository';
import { AppError, NotFoundError } from '@utils/appError';
import { ErrorCode } from '../types/error';
import Container from '../utils/container';

import { IApiKeyService } from './interfaces/apiKey.service.interface';

/**
 * Service for managing API keys
 */
@Service()
export class ApiKeyService implements IApiKeyService {
	/**
	 * Create a new API key
	 * @param userId User ID
	 * @param name API key name
	 * @param scopes Optional scopes for the API key
	 * @returns Created API key with unhashed key value
	 */
	async createApiKey(
		userId: string,
		name: string,
		scopes: string[] = []
	): Promise<{
		id: string;
		name: string;
		key: string;
		scopes?: string[];
		createdAt: Date;
	}> {
		// Check if user exists
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Generate a random API key
		const apiKeyValue = randomBytes(32).toString('hex');

		// Hash the API key for storage
		const hashedKey = this.hashApiKey(apiKeyValue);

		// Create the API key
		const apiKey = await apiKeyRepository.create({
			name,
			key: hashedKey,
			scopes,
			userId,
		});

		// Return the unhashed key (this is the only time it will be available)
		const result = {
			id: apiKey.id,
			name: apiKey.name,
			key: apiKeyValue,
			createdAt: apiKey.created_at,
		};

		// Only add scopes if they exist
		if (apiKey.scopes && apiKey.scopes.length > 0) {
			return {
				...result,
				scopes: apiKey.scopes,
			};
		}

		return result;
	}

	/**
	 * Validate an API key
	 * @param apiKey API key value
	 * @returns API key and associated user
	 */
	async validateApiKey(apiKey: string): Promise<{
		apiKey: {
			id: string;
			name: string;
			scopes?: string[];
		};
		user: {
			id: string;
			name: string;
			email: string;
			role: string;
		};
	}> {
		const hashedKey = this.hashApiKey(apiKey);

		// Find the API key
		const apiKeyEntity = await apiKeyRepository.findByKey(hashedKey);
		if (!apiKeyEntity) {
			throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid API key', 401);
		}

		// Get the associated user
		const user = await userRepository.findById(apiKeyEntity.userId);
		if (!user) {
			throw new AppError(
				ErrorCode.UNAUTHORIZED,
				'User not found for API key',
				401
			);
		}

		const result = {
			apiKey: {
				id: apiKeyEntity.id,
				name: apiKeyEntity.name,
			},
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
			},
		} as {
			apiKey: {
				id: string;
				name: string;
				scopes?: string[];
			};
			user: {
				id: string;
				name: string;
				email: string;
				role: string;
			};
		};

		// Only add scopes if they exist
		if (apiKeyEntity.scopes && apiKeyEntity.scopes.length > 0) {
			result.apiKey = {
				...result.apiKey,
				scopes: apiKeyEntity.scopes,
			};
		}

		return result;
	}

	/**
	 * Revoke an API key
	 * @param id API key ID
	 * @param userId User ID
	 * @returns Success status
	 */
	async revokeApiKey(
		id: string,
		userId: string
	): Promise<{
		success: boolean;
	}> {
		// Check if API key exists and belongs to the user
		const apiKey = await apiKeyRepository.findById(id);
		if (!apiKey) {
			throw new NotFoundError('API key not found');
		}

		if (apiKey.userId !== userId) {
			throw new AppError(
				ErrorCode.FORBIDDEN,
				'You do not have permission to revoke this API key',
				403
			);
		}

		// Revoke the API key
		await apiKeyRepository.revoke(id);

		return { success: true };
	}

	/**
	 * List API keys for a user
	 * @param userId User ID
	 * @returns List of API keys
	 */
	async listApiKeys(userId: string): Promise<
		Array<{
			id: string;
			name: string;
			scopes?: string[];
			created_at: Date;
			updated_at: Date;
		}>
	> {
		// Check if user exists
		const user = await userRepository.findById(userId);
		if (!user) {
			throw new NotFoundError('User not found');
		}

		// Get API keys for the user
		const apiKeys = await apiKeyRepository.findByUserId(userId);

		// Return API keys without sensitive information
		return apiKeys.map((apiKey) => {
			const result = {
				id: apiKey.id,
				name: apiKey.name,
				created_at: apiKey.created_at,
				updated_at: apiKey.updated_at,
			};

			// Only add scopes if they exist
			if (apiKey.scopes && apiKey.scopes.length > 0) {
				return {
					...result,
					scopes: apiKey.scopes,
				};
			}

			return result;
		});
	}

	/**
	 * Hash an API key
	 * @param apiKey API key to hash
	 * @returns Hashed API key
	 */
	private hashApiKey(apiKey: string): string {
		return createHash('sha256').update(apiKey).digest('hex');
	}
}

export const apiKeyService = Container.get(ApiKeyService);
