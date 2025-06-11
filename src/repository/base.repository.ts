import type {
	DeepPartial,
	FindManyOptions,
	FindOptionsWhere,
	ObjectLiteral,
	Repository,
	QueryRunner,
	EntityManager,
	DataSource,
} from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

import { NotFoundError, DatabaseError } from '@utils/appError';

import type { IRepository } from './interfaces/repository.interface';

/**
 * Base repository implementation that provides common functionality for all repositories
 */
export class BaseRepository<T extends ObjectLiteral> implements IRepository<T> {
	constructor(
		protected repository: Repository<T>,
		private dataSource?: DataSource
	) {}

	/**
	 * Create a new entity
	 * @param data Entity data
	 * @returns Created entity
	 */
	async create(data: DeepPartial<T>): Promise<T> {
		try {
			const entity = this.repository.create(data);
			return await this.repository.save(entity);
		} catch (error) {
			throw new DatabaseError('Failed to create entity', { error });
		}
	}

	/**
	 * Find an entity by ID
	 * @param id Entity ID
	 * @returns Found entity or null
	 */
	async findById(id: string): Promise<T | null> {
		try {
			return await this.repository.findOneBy({
				id,
			} as unknown as FindOptionsWhere<T>);
		} catch (error) {
			throw new DatabaseError('Failed to find entity by ID', {
				error,
				id,
			});
		}
	}

	/**
	 * Find entities by criteria
	 * @param where Where conditions
	 * @returns Found entities
	 */
	async findBy(where: FindOptionsWhere<T>): Promise<T[]> {
		try {
			return await this.repository.findBy(where);
		} catch (error) {
			throw new DatabaseError('Failed to find entities by criteria', {
				error,
				where,
			});
		}
	}

	/**
	 * Find one entity by criteria
	 * @param where Where conditions
	 * @returns Found entity or null
	 */
	async findOneBy(where: FindOptionsWhere<T>): Promise<T | null> {
		try {
			return await this.repository.findOneBy(where);
		} catch (error) {
			throw new DatabaseError('Failed to find entity by criteria', {
				error,
				where,
			});
		}
	}

	/**
	 * Find entities with options
	 * @param options Find options
	 * @returns Found entities
	 */
	async find(options?: FindManyOptions<T>): Promise<T[]> {
		try {
			return await this.repository.find(options);
		} catch (error) {
			throw new DatabaseError('Failed to find entities', {
				error,
				options,
			});
		}
	}

	/**
	 * Update an entity
	 * @param id Entity ID
	 * @param data Entity data
	 * @returns Updated entity
	 */
	async update(id: string, data: DeepPartial<T>): Promise<T> {
		try {
			const updateData = this.repository.create(data);

			await this.repository.update(
				{ id } as unknown as FindOptionsWhere<T>,
				updateData as QueryDeepPartialEntity<T>
			);
			const updatedEntity = await this.findById(id);
			if (!updatedEntity) {
				throw new NotFoundError(`Entity with id ${id} not found`);
			}
			return updatedEntity;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}
			throw new DatabaseError('Failed to update entity', {
				error,
				id,
				data,
			});
		}
	}

	/**
	 * Delete an entity
	 * @param id Entity ID
	 * @returns Deletion result
	 */
	async delete(id: string): Promise<boolean> {
		try {
			const result = await this.repository.delete(id);
			return (
				result.affected !== undefined &&
				result.affected !== null &&
				result.affected > 0
			);
		} catch (error) {
			throw new DatabaseError('Failed to delete entity', { error, id });
		}
	}

	/**
	 * Save an entity
	 * @param entity Entity to save
	 * @returns Saved entity
	 */
	async save(entity: T): Promise<T> {
		try {
			return await this.repository.save(entity);
		} catch (error) {
			throw new DatabaseError('Failed to save entity', { error });
		}
	}

	/**
	 * Start a transaction
	 * @returns QueryRunner for the transaction
	 */
	async startTransaction(): Promise<QueryRunner> {
		if (!this.dataSource) {
			throw new DatabaseError(
				'DataSource is not available for transactions'
			);
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();
		return queryRunner;
	}

	/**
	 * Commit a transaction
	 * @param queryRunner QueryRunner for the transaction
	 */
	async commitTransaction(queryRunner: QueryRunner): Promise<void> {
		try {
			await queryRunner.commitTransaction();
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Rollback a transaction
	 * @param queryRunner QueryRunner for the transaction
	 */
	async rollbackTransaction(queryRunner: QueryRunner): Promise<void> {
		try {
			await queryRunner.rollbackTransaction();
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * Execute operations within a transaction
	 * @param callback Function to execute within the transaction
	 * @returns Result of the callback function
	 */
	async withTransaction<R>(
		callback: (entityManager: EntityManager) => Promise<R>
	): Promise<R> {
		if (!this.dataSource) {
			throw new DatabaseError(
				'DataSource is not available for transactions'
			);
		}

		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const result = await callback(queryRunner.manager);
			await queryRunner.commitTransaction();
			return result;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}
}
