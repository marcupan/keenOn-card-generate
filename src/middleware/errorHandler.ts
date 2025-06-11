import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

import {
	AppError,
	ValidationError,
	AuthenticationError,
	DatabaseError,
} from '@utils/appError';
import type { NextFunction, Request, Response } from 'express';

import { ErrorCode } from '../types/error';

interface ErrorWithCode extends Error {
	code?: string;
	statusCode?: number;
}

const handleJWTError = (
	error: JsonWebTokenError | TokenExpiredError
): AppError => {
	if (error instanceof TokenExpiredError) {
		return new AuthenticationError(
			'Your token has expired. Please log in again.'
		);
	}
	return new AuthenticationError('Invalid token. Please log in again.');
};

const handleTypeORMError = (error: QueryFailedError): AppError => {
	if (error.message.includes('duplicate key')) {
		return new AppError(ErrorCode.CONFLICT, 'Duplicate entry found.', 409, {
			detail: error.message,
		});
	}

	return new DatabaseError('Database error occurred', {
		detail: error.message,
	});
};

const handleZodError = (error: ZodError): ValidationError => {
	const validationErrors = error.errors.map((err) => ({
		field: err.path.join('.'),
		message: err.message,
	}));

	return new ValidationError({
		message: 'Validation failed',
		errors: validationErrors,
	});
};

export const errorHandler = (
	err: ErrorWithCode,
	req: Request,
	res: Response,
	_next: NextFunction
) => {
	let error = err;

	console.error({
		timestamp: new Date().toISOString(),
		path: req.path,
		method: req.method,
		error: {
			name: err.name,
			message: err.message,
			stack:
				process.env['NODE_ENV'] === 'development'
					? err.stack
					: undefined,
		},
	});

	if (err instanceof ZodError) {
		error = handleZodError(err);
	} else if (err instanceof QueryFailedError) {
		error = handleTypeORMError(err);
	} else if (
		err instanceof JsonWebTokenError ||
		err instanceof TokenExpiredError
	) {
		error = handleJWTError(err);
	} else if (!(err instanceof AppError)) {
		error = new AppError(
			ErrorCode.INTERNAL_SERVER_ERROR,
			'Something went wrong',
			500,
			process.env['NODE_ENV'] === 'development'
				? { originalError: { message: err.message, stack: err.stack } }
				: undefined
		);
	}

	if (err.code === 'CORS_ERROR') {
		error = new AppError(
			ErrorCode.FORBIDDEN,
			'CORS error: Origin not allowed',
			403
		);
	}

	const response =
		error instanceof AppError
			? error.toResponse()
			: {
					code: ErrorCode.INTERNAL_SERVER_ERROR,
					message: 'Something went wrong',
				};

	if ('id' in req && typeof req.id === 'string') {
		response.requestId = req.id;
	}

	if (res.headersSent) {
		return;
	}

	return res
		.status(error instanceof AppError ? error.statusCode : 500)
		.json(response);
};

export const notFoundHandler = (
	req: Request,
	_res: Response,
	next: NextFunction
): void => {
	next(
		new AppError(
			ErrorCode.NOT_FOUND,
			`Route ${req.originalUrl} not found`,
			404
		)
	);
};

export const asyncHandler = <T>(
	fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
	return (req: Request, res: Response, next: NextFunction): void => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
};

export const rateLimitHandler = (
	_req: Request,
	res: Response,
	_next: NextFunction
): void => {
	const error = new AppError(
		ErrorCode.TOO_MANY_REQUESTS,
		'Too many requests from this IP, please try again later',
		429
	);

	if (res.headersSent) {
		return;
	}

	res.status(error.statusCode).json(error.toResponse());
};
