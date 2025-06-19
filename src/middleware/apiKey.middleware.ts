import { Request, Response, NextFunction } from 'express';

import { apiKeyService } from '@service/apiKey.service';
import { AppError } from '@utils/appError';
import { ErrorCode } from '../types/error';
import Logger from '@utils/logger';

/**
 * Middleware for API key authentication
 * @param req Express request
 * @param _res Express response
 * @param next Express next function
 */
export const apiKeyAuth = async (
	req: Request,
	_res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const apiKey = req.headers['x-api-key'];

		if (!apiKey || typeof apiKey !== 'string') {
			return next(
				new AppError(ErrorCode.UNAUTHORIZED, 'API key is required', 401)
			);
		}

		const { user } = await apiKeyService.validateApiKey(apiKey);

		req.user = user;

		Logger.debug(
			`API key used: ${apiKey.substring(0, 8)}... by user ${user.id}`
		);

		next();
	} catch (error) {
		next(error);
	}
};

/**
 * Middleware for API key authentication with specific scopes
 * @param requiredScopes Scopes required for the operation
 * @returns Express middleware
 */
export const apiKeyWithScopes = (requiredScopes: string[]) => {
	return async (
		req: Request,
		_res: Response,
		next: NextFunction
	): Promise<void> => {
		try {
			const apiKey = req.headers['x-api-key'];

			if (!apiKey || typeof apiKey !== 'string') {
				return next(
					new AppError(
						ErrorCode.UNAUTHORIZED,
						'API key is required',
						401
					)
				);
			}

			const { apiKey: apiKeyData, user } =
				await apiKeyService.validateApiKey(apiKey);

			const hasRequiredScopes = requiredScopes.every((scope) =>
				apiKeyData.scopes?.includes(scope)
			);

			if (!hasRequiredScopes) {
				return next(
					new AppError(
						ErrorCode.FORBIDDEN,
						'API key does not have required scopes',
						403
					)
				);
			}

			req.user = user;

			Logger.debug(
				`API key used: ${apiKey.substring(0, 8)}... by user ${user.id}`
			);

			next();
		} catch (error) {
			next(error);
		}
	};
};
