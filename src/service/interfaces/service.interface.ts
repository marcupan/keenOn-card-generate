import type { DeepPartial } from 'typeorm';

/**
 * Generic service interface that defines common operations for all services
 */
export interface IService<T> {
	/**
	 * Create a new entity
	 * @param data Entity data
	 * @returns Created entity
	 */
	create(data: DeepPartial<T>): Promise<T>;

	/**
	 * Find an entity by ID
	 * @param id Entity ID
	 * @returns Found entity or null
	 */
	findById(id: string): Promise<T | null>;

	/**
	 * Find one entity by criteria
	 * @param criteria Search criteria
	 * @returns Found entity or null
	 */
	findOne(criteria: Record<string, unknown>): Promise<T | null>;

	/**
	 * Update an entity
	 * @param id Entity ID
	 * @param data Entity data
	 * @returns Updated entity
	 */
	update(id: string, data: DeepPartial<T>): Promise<T>;

	/**
	 * Delete an entity
	 * @param id Entity ID
	 * @returns Deletion result
	 */
	delete(id: string): Promise<boolean>;
}
