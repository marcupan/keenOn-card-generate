import type { DeepPartial, FindManyOptions, FindOptionsWhere } from 'typeorm';

/**
 * Generic repository interface that defines common operations for all repositories
 */
export interface IRepository<T> {
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
	 * Find entities by criteria
	 * @param where Where conditions
	 * @returns Found entities
	 */
	findBy(where: FindOptionsWhere<T>): Promise<T[]>;

	/**
	 * Find one entity by criteria
	 * @param where Where conditions
	 * @returns Found entity or null
	 */
	findOneBy(where: FindOptionsWhere<T>): Promise<T | null>;

	/**
	 * Find entities with options
	 * @param options Find options
	 * @returns Found entities
	 */
	find(options?: FindManyOptions<T>): Promise<T[]>;

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

	/**
	 * Save an entity
	 * @param entity Entity to save
	 * @returns Saved entity
	 */
	save(entity: T): Promise<T>;
}
