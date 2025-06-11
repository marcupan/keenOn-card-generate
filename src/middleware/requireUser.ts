import type { NextFunction, Request, Response } from 'express';

import { ErrorCode } from '../types/error';
import { AppError } from '../utils/appError';

export const requireUser = (
	_req: Request,
	res: Response,
	next: NextFunction
): void => {
	try {
		const user = res.locals['user'];

		if (!user) {
			if (res.headersSent) {
				return;
			}

			return next(
				new AppError(
					ErrorCode.BAD_REQUEST,
					`Session has expired or user doesn't exist`,
					400
				)
			);
		}

		next();
	} catch (err: unknown) {
		if (res.headersSent) {
			return;
		}

		next(err);
	}
};
