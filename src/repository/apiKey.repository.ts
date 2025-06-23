import { Repository } from 'typeorm';
import { AppDataSource } from '@utils/dataSource';
import { ApiKey } from '@entities/apiKey.entity';
import { NotFoundError } from '@utils/appError';

/**
 * Repository for API key operations
 */
class ApiKeyRepository {
	private repository: Repository<ApiKey>;

	constructor() {
		this.repository = AppDataSource.getRepository(ApiKey);
	}

	/**
	 * Find an API key by ID
	 * @param id API key ID
	 * @returns Found API key or null
	 */
	async findById(id: string): Promise<ApiKey | null> {
		return this.repository.findOne({ where: { id } });
	}

	/**
	 * Find an API key by key value
	 * @param key API key value
	 * @returns Found API key or null
	 */
	async findByKey(key: string): Promise<ApiKey | null> {
		return this.repository.findOne({ where: { key, revoked: false } });
	}

	/**
	 * Find API keys by user ID
	 * @param userId User ID
	 * @returns Found API keys
	 */
	async findByUserId(userId: string): Promise<ApiKey[]> {
		return this.repository.find({ where: { userId, revoked: false } });
	}

	/**
	 * Create a new API key
	 * @param data API key data
	 * @returns Created API key
	 */
	async create(data: Partial<ApiKey>): Promise<ApiKey> {
		const apiKey = this.repository.create(data);
		return this.repository.save(apiKey);
	}

	/**
	 * Update an API key
	 * @param id API key ID
	 * @param data API key data
	 * @returns Updated API key
	 */
	async update(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
		const apiKey = await this.findById(id);
		if (!apiKey) {
			throw new NotFoundError('API key not found');
		}

		Object.assign(apiKey, data);
		return this.repository.save(apiKey);
	}

	/**
	 * Revoke an API key
	 * @param id API key ID
	 * @returns Success status
	 */
	async revoke(id: string): Promise<boolean> {
		const apiKey = await this.findById(id);
		if (!apiKey) {
			throw new NotFoundError('API key not found');
		}

		apiKey.revoked = true;
		await this.repository.save(apiKey);
		return true;
	}

	/**
	 * Delete an API key
	 * @param id API key ID
	 * @returns Success status
	 */
	async delete(id: string): Promise<boolean> {
		const apiKey = await this.findById(id);
		if (!apiKey) {
			throw new NotFoundError('API key not found');
		}

		await this.repository.softDelete(id);
		return true;
	}

	/**
	 * Save an API key
	 * @param apiKey API key to save
	 * @returns Saved API key
	 */
	async save(apiKey: ApiKey): Promise<ApiKey> {
		return this.repository.save(apiKey);
	}
}

export const apiKeyRepository = new ApiKeyRepository();
