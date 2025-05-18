import { NextFunction, Request, Response } from 'express';

import { ErrorCode } from '../types/error';
import { AppError } from '../utils/appError';

export const requireUser = (_: Request, res: Response, next: NextFunction) => {
	try {
		const user = res.locals.user;

		if (!user) {
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
		next(err);
	}
};
