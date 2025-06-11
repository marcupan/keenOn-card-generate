import { z } from 'zod';

import type { NextFunction } from 'express';

import { ValidationError } from './appError';

type ValidatedSource = 'body' | 'query' | 'params';

type RequestValidation<T, S extends ValidatedSource> = {
	[K in ValidatedSource]: K extends S ? T : unknown;
};

/**
 * Validates data against a Zod schema and returns the validated data
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @param errorMessage Custom error message for validation failures
 * @returns The validated and typed data
 * @throws ValidationError if validation fails
 */
export function validateData<T extends z.ZodType>(
	schema: T,
	data: unknown,
	errorMessage = 'Validation failed'
): z.infer<T> {
	try {
		return schema.parse(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors = error.errors.map((err) => ({
				field: err.path.join('.'),
				message: err.message,
				code: err.code,
			}));
			throw new ValidationError({
				message: errorMessage,
				errors,
			});
		}
		throw error;
	}
}

/**
 * Asynchronously validates data against a Zod schema and returns the validated data
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @param errorMessage Custom error message for validation failures
 * @returns Promise with the validated and typed data
 * @throws ValidationError if validation fails
 */
export async function validateDataAsync<T extends z.ZodType>(
	schema: T,
	data: unknown,
	errorMessage = 'Validation failed'
): Promise<z.infer<T>> {
	try {
		return await schema.parseAsync(data);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors = error.errors.map((err) => ({
				field: err.path.join('.'),
				message: err.message,
				code: err.code,
			}));
			throw new ValidationError({
				message: errorMessage,
				errors,
			});
		}
		throw error;
	}
}

/**
 * Creates a middleware function that validates request data against a schema
 * @param schema The schema to validate against
 * @param dataSource Where to find the data in the request (body, query, params)
 * @param errorMessage Custom error message for validation failures
 * @returns Express middleware function
 */
export function createValidationMiddleware<
	T extends z.ZodType,
	S extends ValidatedSource = 'body',
>(schema: T, dataSource: S = 'body' as S, errorMessage = 'Validation failed') {
	return (
		req: Request & RequestValidation<z.infer<T>, S>,
		_: Response,
		next: NextFunction
	): void => {
		try {
			const data = req[dataSource];
			req[dataSource] = validateData(schema, data, errorMessage);
			next();
		} catch (error) {
			next(error);
		}
	};
}
