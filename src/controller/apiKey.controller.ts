import { Request, Response, NextFunction } from 'express';

import { apiKeyService } from '@service/apiKey.service';
import { AppError } from '@utils/appError';
import { ErrorCode } from '../types/error';

/**
 * Controller for API key management
 */
class ApiKeyController {
	/**
	 * Create a new API key
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	createApiKey(req: Request, res: Response, next: NextFunction): void {
		void (async () => {
			try {
				const userId = res.locals['user'].id;
				if (!userId) {
					throw new AppError(
						ErrorCode.UNAUTHORIZED,
						'User not authenticated',
						401
					);
				}

				const { name, scopes } = req.body;
				if (!name) {
					throw new AppError(
						ErrorCode.BAD_REQUEST,
						'API key name is required',
						400
					);
				}

				const result = await apiKeyService.createApiKey(
					userId,
					name,
					scopes
				);

				if (res.headersSent) {
					return;
				}

				res.status(201).json({
					status: 'success',
					data: result,
				});
			} catch (err: unknown) {
				if (res.headersSent) {
					return;
				}

				next(err);
			}
		})();
	}

	/**
	 * List API keys for the authenticated user
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	listApiKeys(_req: Request, res: Response, next: NextFunction): void {
		void (async () => {
			try {
				const userId = res.locals['user'].id;
				if (!userId) {
					throw new AppError(
						ErrorCode.UNAUTHORIZED,
						'User not authenticated',
						401
					);
				}

				const apiKeys = await apiKeyService.listApiKeys(userId);

				if (res.headersSent) {
					return;
				}

				res.status(200).json({
					status: 'success',
					data: apiKeys,
				});
			} catch (err: unknown) {
				if (res.headersSent) {
					return;
				}

				next(err);
			}
		})();
	}

	/**
	 * Revoke an API key
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	revokeApiKey(req: Request, res: Response, next: NextFunction): void {
		void (async () => {
			try {
				const userId = res.locals['user'].id;
				if (!userId) {
					throw new AppError(
						ErrorCode.UNAUTHORIZED,
						'User not authenticated',
						401
					);
				}

				const { id } = req.params;
				if (!id) {
					throw new AppError(
						ErrorCode.BAD_REQUEST,
						'API key ID is required',
						400
					);
				}

				const result = await apiKeyService.revokeApiKey(id, userId);

				if (res.headersSent) {
					return;
				}

				res.status(200).json({
					status: 'success',
					data: result,
				});
			} catch (err: unknown) {
				if (res.headersSent) {
					return;
				}

				next(err);
			}
		})();
	}
}

export const apiKeyController = new ApiKeyController();
