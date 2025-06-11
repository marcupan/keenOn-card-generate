import config from 'config';

import redisClient from './connectRedis';
import logger from './logger';

/**
 * Cache TTL settings in seconds for different data types
 */
export enum CacheTTL {
	SHORT = 60,
	MEDIUM = 300,
	LONG = 1800,
	VERY_LONG = 3600,
	DAY = 86400,
}

/**
 * Centralized caching service for Redis
 * Provides methods for caching and retrieving data with proper TTL settings
 */
export class CacheService {
	private readonly defaultTTL: number;

	constructor() {
		this.defaultTTL = config.get<number>('redisCacheExpiresIn') * 60;
	}

	/**
	 * Set a value in the cache with a TTL
	 * @param key - Cache key
	 * @param value - Value to cache (will be JSON stringified)
	 * @param ttl - TTL in seconds (optional, defaults to config value)
	 */
	async set<T>(key: string, value: T, ttl?: number): Promise<void> {
		try {
			await redisClient.set(key, JSON.stringify(value), {
				EX: ttl ?? this.defaultTTL,
			});
			logger.debug(`Cache set: ${key} (TTL: ${ttl ?? this.defaultTTL}s)`);
		} catch (error) {
			logger.error(`Error setting cache for key ${key}:`, error);
		}
	}

	/**
	 * Get a value from the cache
	 * @param key - Cache key
	 * @returns The cached value or null if not found
	 */
	async get<T>(key: string): Promise<T | null> {
		try {
			const data = await redisClient.get(key);
			if (!data) {
				return null;
			}

			logger.debug(`Cache hit: ${key}`);
			return JSON.parse(data) as T;
		} catch (error) {
			logger.error(`Error getting cache for key ${key}:`, error);
			return null;
		}
	}

	/**
	 * Delete a value from the cache
	 * @param key - Cache key
	 */
	async delete(key: string): Promise<void> {
		try {
			await redisClient.del(key);
			logger.debug(`Cache deleted: ${key}`);
		} catch (error) {
			logger.error(`Error deleting cache for key ${key}:`, error);
		}
	}

	/**
	 * Delete multiple values from the cache using a pattern
	 * @param pattern - Key pattern to match (e.g., "user:*")
	 */
	async deletePattern(pattern: string): Promise<void> {
		try {
			const keys = await redisClient.keys(pattern);
			if (keys.length > 0) {
				await redisClient.del(keys);
				logger.debug(
					`Cache deleted by pattern: ${pattern} (${keys.length} keys)`
				);
			}
		} catch (error) {
			logger.error(`Error deleting cache by pattern ${pattern}:`, error);
		}
	}

	/**
	 * Get or set cache - retrieves from cache if exists, otherwise executes the factory function and caches the result
	 * @param key - Cache key
	 * @param factory - Function that returns the data to cache if not found
	 * @param ttl - TTL in seconds (optional, defaults to config value)
	 * @returns The cached or newly generated value
	 */
	async getOrSet<T>(
		key: string,
		factory: () => Promise<T>,
		ttl?: number
	): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const data = await factory();
		await this.set(key, data, ttl);
		return data;
	}
}

export const cacheService = new CacheService();
