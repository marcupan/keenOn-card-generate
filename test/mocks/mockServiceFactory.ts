import { DeepPartial } from 'typeorm';

import { IService } from '../../src/service/interfaces/service.interface';

/**
 * Creates a mock service that implements the IService interface
 * @param mockData Initial mock data
 * @returns A mock service implementation
 */
export function createMockService<T extends { id: string }>(
	mockData: T[] = []
): jest.Mocked<IService<T>> {
	let data = [...mockData];

	const mockService: jest.Mocked<IService<T>> = {
		create: jest.fn(async (entityData: DeepPartial<T>) => {
			const newEntity = {
				id: `mock-id-${Date.now()}`,
				...entityData,
			} as unknown as T;
			data.push(newEntity);
			return newEntity;
		}),

		findById: jest.fn(async (id: string) => {
			const entity = data.find((item) => item.id === id) || null;
			return entity;
		}),

		findOne: jest.fn(async (criteria: Record<string, unknown>) => {
			const entity =
				data.find((item) => {
					return Object.entries(criteria).every(([key, value]) => {
						return (item as any)[key] === value;
					});
				}) || null;
			return entity;
		}),

		update: jest.fn(async (id: string, entityData: DeepPartial<T>) => {
			const index = data.findIndex((item) => item.id === id);
			if (index === -1) {
				throw new Error(`Entity with id ${id} not found`);
			}

			const updatedEntity = {
				...data[index],
				...entityData,
			} as T;

			data[index] = updatedEntity;
			return updatedEntity;
		}),

		delete: jest.fn(async (id: string) => {
			const initialLength = data.length;
			data = data.filter((item) => item.id !== id);
			return data.length < initialLength;
		}),
	};

	return mockService;
}

/**
 * Creates a mock repository with common repository methods
 * @param mockData Initial mock data
 * @returns A mock repository implementation
 */
export function createMockRepository<T extends { id: string }>(
	mockData: T[] = []
): any {
	let data = [...mockData];

	return {
		find: jest.fn(async () => data),
		findOne: jest.fn(async (options: any) => {
			if (options.where) {
				return (
					data.find((item) => {
						return Object.entries(options.where).every(
							([key, value]) => {
								return (item as any)[key] === value;
							}
						);
					}) || null
				);
			}
			return null;
		}),
		findOneBy: jest.fn(async (criteria: any) => {
			return (
				data.find((item) => {
					return Object.entries(criteria).every(([key, value]) => {
						return (item as any)[key] === value;
					});
				}) || null
			);
		}),
		save: jest.fn(async (entity: any) => {
			if (Array.isArray(entity)) {
				const savedEntities = entity.map((e) => {
					if (e.id) {
						const index = data.findIndex(
							(item) => item.id === e.id
						);
						if (index !== -1) {
							data[index] = { ...data[index], ...e };
							return data[index];
						}
					}
					const newEntity = { id: `mock-id-${Date.now()}`, ...e };
					data.push(newEntity as T);
					return newEntity;
				});
				return savedEntities;
			} else {
				if (entity.id) {
					const index = data.findIndex(
						(item) => item.id === entity.id
					);
					if (index !== -1) {
						data[index] = { ...data[index], ...entity };
						return data[index];
					}
				}
				const newEntity = { id: `mock-id-${Date.now()}`, ...entity };
				data.push(newEntity as T);
				return newEntity;
			}
		}),
		remove: jest.fn(async (entity: any) => {
			if (Array.isArray(entity)) {
				const ids = entity.map((e) => e.id);
				data = data.filter((item) => !ids.includes(item.id));
				return entity;
			} else {
				data = data.filter((item) => item.id !== entity.id);
				return entity;
			}
		}),
		softRemove: jest.fn(async (entity: any) => {
			if (Array.isArray(entity)) {
				const ids = entity.map((e) => e.id);
				data = data.map((item) => {
					if (ids.includes(item.id)) {
						return { ...item, deleted_at: new Date() };
					}
					return item;
				}) as T[];
				return entity;
			} else {
				data = data.map((item) => {
					if (item.id === entity.id) {
						return { ...item, deleted_at: new Date() };
					}
					return item;
				}) as T[];
				return entity;
			}
		}),
		softDelete: jest.fn(async (criteria: any) => {
			if (typeof criteria === 'string') {
				data = data.map((item) => {
					if (item.id === criteria) {
						return { ...item, deleted_at: new Date() };
					}
					return item;
				}) as T[];
				return { affected: 1 };
			} else {
				const matchingItems = data.filter((item) => {
					return Object.entries(criteria).every(([key, value]) => {
						return (item as any)[key] === value;
					});
				});
				data = data.map((item) => {
					if (matchingItems.includes(item)) {
						return { ...item, deleted_at: new Date() };
					}
					return item;
				}) as T[];
				return { affected: matchingItems.length };
			}
		}),
		count: jest.fn(async () => data.length),
		clear: jest.fn(async () => {
			data = [];
			return { affected: data.length };
		}),
		createQueryBuilder: jest.fn(() => ({
			where: jest.fn().mockReturnThis(),
			andWhere: jest.fn().mockReturnThis(),
			orWhere: jest.fn().mockReturnThis(),
			leftJoinAndSelect: jest.fn().mockReturnThis(),
			innerJoinAndSelect: jest.fn().mockReturnThis(),
			orderBy: jest.fn().mockReturnThis(),
			addOrderBy: jest.fn().mockReturnThis(),
			skip: jest.fn().mockReturnThis(),
			take: jest.fn().mockReturnThis(),
			getOne: jest.fn(async () => data[0] || null),
			getMany: jest.fn(async () => data),
			getManyAndCount: jest.fn(async () => [data, data.length]),
			getCount: jest.fn(async () => data.length),
			execute: jest.fn(async () => data),
		})),
	};
}
