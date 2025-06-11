import { v4 as uuidv4 } from 'uuid';

import { AppError } from '@utils/appError';
import type { Request, Response, NextFunction } from 'express';

import { ErrorCode } from '../types/error';
import Logger from '../utils/logger';

interface RequestWithUser extends Request {
	user?: {
		id: string;
	};
}

/**
 * Constants for error recovery conditions
 */
const ERROR_RECOVERY_CONDITIONS = {
	HEADERS_SENT: 'Cannot set headers after they are sent to the client',
	EMAIL_RELATED: [
		'SMTP',
		'email',
		'mail',
		'nodemailer',
		'ECONNRESET',
		'ETIMEDOUT',
		'ECONNREFUSED',
	],
} as const;

/**
 * Type guard to check if an error is recoverable
 */
function isRecoverableError(error: Error): boolean {
	const errorMessage = error.message?.toLowerCase() ?? '';

	return (
		errorMessage.includes(
			ERROR_RECOVERY_CONDITIONS.HEADERS_SENT.toLowerCase()
		) ||
		ERROR_RECOVERY_CONDITIONS.EMAIL_RELATED.some((term) =>
			errorMessage.toLowerCase().includes(term.toLowerCase())
		)
	);
}

/**
 * Error boundary middleware that catches all unhandled errors and converts them to AppError
 */
export const errorBoundary = (
	err: Error | AppError,
	req: RequestWithUser,
	res: Response,
	next: NextFunction
): void => {
	const errorId = uuidv4();

	if (res.headersSent) {
		Logger.warn(
			'Headers already sent, cannot propagate error through errorBoundary',
			{
				path: req.path,
				method: req.method,
				error: err.message,
			}
		);
		return;
	}

	if (err instanceof AppError) {
		const updatedError = new AppError(
			err.code,
			err.message,
			err.statusCode,
			{ ...err.details, errorId }
		);
		return next(updatedError);
	}

	const isDevelopment = process.env['NODE_ENV'] === 'development';
	Logger.error(`Unhandled error (${errorId}):`, {
		error: err.message,
		stack: err.stack,
		url: req.originalUrl,
		method: req.method,
		ip: req.ip,
		userId: req.user?.id,
	});

	const message = isDevelopment
		? `Unhandled error: ${err.message}`
		: 'An unexpected error occurred. Please try again later.';

	const appError = new AppError(
		ErrorCode.INTERNAL_SERVER_ERROR,
		message,
		500,
		{
			errorId,
			...(isDevelopment && {
				originalError: err.message,
				stack: err.stack,
			}),
		}
	);

	next(appError);
};

/**
 * Process-level uncaught exception handler
 */
export const setupGlobalErrorHandlers = (): void => {
	process.on('uncaughtException', (error: Error) => {
		const errorId = uuidv4();
		Logger.error(`Uncaught Exception (${errorId}):`, {
			error: error.message,
			stack: error.stack,
		});

		if (isRecoverableError(error)) {
			Logger.warn(
				'Recovered from recoverable error. Server will continue running.',
				{
					error: error.message,
					stack: error.stack,
				}
			);
			return;
		}

		setTimeout(() => process.exit(1), 1000);
	});

	process.on(
		'unhandledRejection',
		(reason: unknown, promise: Promise<unknown>) => {
			const errorId = uuidv4();
			Logger.error(`Unhandled Rejection (${errorId}):`, {
				reason,
				promise,
			});

			const reasonStr = String(reason);
			if (
				ERROR_RECOVERY_CONDITIONS.EMAIL_RELATED.some((term) =>
					reasonStr.includes(term)
				)
			) {
				Logger.warn(
					'Recovered from email-related promise rejection. Server will continue running.',
					{
						reason: reasonStr,
					}
				);
			}
		}
	);
};
