import { Request, Response, NextFunction } from 'express';

import { twoFactorService } from '@service/twoFactor.service';
import { AppError } from '@utils/appError';
import { ErrorCode } from '../types/error';

/**
 * Controller for handling two-factor authentication endpoints
 */
class TwoFactorController {
	/**
	 * Generate a secret for two-factor authentication
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	generateSecret(_req: Request, res: Response, next: NextFunction): void {
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

				const result = await twoFactorService.generateSecret(userId);

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

	/**
	 * Verify and enable two-factor authentication
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	verifyAndEnable(req: Request, res: Response, next: NextFunction): void {
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

				const { token } = req.body;
				if (!token) {
					throw new AppError(
						ErrorCode.BAD_REQUEST,
						'Verification code is required',
						400
					);
				}

				const result = await twoFactorService.verifyAndEnable(
					userId,
					token
				);

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

	/**
	 * Verify a token for two-factor authentication
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	verify(req: Request, res: Response, next: NextFunction): void {
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

				const { token } = req.body;
				if (!token) {
					throw new AppError(
						ErrorCode.BAD_REQUEST,
						'Verification code is required',
						400
					);
				}

				const result = await twoFactorService.verify(userId, token);

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

	/**
	 * Disable two-factor authentication
	 * @param req Express request
	 * @param res Express response
	 * @param next Express next function
	 */
	disable(_req: Request, res: Response, next: NextFunction): void {
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

				const result = await twoFactorService.disable(userId);

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

export const twoFactorController = new TwoFactorController();
