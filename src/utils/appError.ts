import type {
	ErrorResponse,
	ValidationError as IValidationError,
} from '../types/error';
import { ErrorCode } from '../types/error';

export class AppError extends Error {
	public readonly code: ErrorCode;
	public readonly statusCode: number;
	public readonly details?: Record<string, unknown> | undefined;
	public readonly isOperational: boolean;

	constructor(
		code: ErrorCode,
		message: string,
		statusCode: number,
		details?: Record<string, unknown>
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.statusCode = statusCode;
		this.details = details;
		this.isOperational = true;

		Error.captureStackTrace(this, this.constructor);
	}

	public toResponse(): ErrorResponse {
		const response: ErrorResponse = {
			code: this.code,
			message: this.message,
		};

		if (this.details) {
			response.details = this.details;
		}

		if (process.env['NODE_ENV'] === 'development') {
			response.stack = this.stack;
		}

		return response;
	}
}

export class ValidationError extends AppError {
	constructor({
		message,
		errors,
	}: {
		message: string;
		errors: IValidationError[];
	}) {
		super(ErrorCode.VALIDATION_ERROR, message, 400, {
			validationErrors: errors,
		});
	}
}

export class DatabaseError extends AppError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(ErrorCode.INTERNAL_SERVER_ERROR, message, 500, details);
	}
}

export class AuthenticationError extends AppError {
	constructor(message: string) {
		super(ErrorCode.UNAUTHORIZED, message, 401);
	}
}

export class ForbiddenError extends AppError {
	constructor(message: string) {
		super(ErrorCode.FORBIDDEN, message, 403);
	}
}

export class NotFoundError extends AppError {
	constructor(message: string) {
		super(ErrorCode.NOT_FOUND, message, 404);
	}
}

export class ConflictError extends AppError {
	constructor(message: string) {
		super(ErrorCode.CONFLICT, message, 409);
	}
}
