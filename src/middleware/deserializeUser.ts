import type { NextFunction, Request, Response } from 'express';

import { userService } from '../service/user.service';
import { ErrorCode } from '../types/error';
import { AppError } from '../utils/appError';
import redisClient from '../utils/connectRedis';
import { verifyJwt } from '../utils/jwt';

export const deserializeUser = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const accessToken = req.cookies['access_token'];
			if (!accessToken) {
				if (!res.headersSent) {
					return next(
						new AppError(
							ErrorCode.UNAUTHORIZED,
							'You are not logged in',
							401
						)
					);
				}
				return;
			}

			let decoded: { sub: string } | null;
			try {
				decoded = verifyJwt<{ sub: string }>(
					accessToken,
					'accessTokenPublicKey'
				);
			} catch {
				if (!res.headersSent) {
					return next(
						new AppError(
							ErrorCode.UNAUTHORIZED,
							'Invalid token or token verification failed',
							401
						)
					);
				}
				return;
			}

			if (!decoded) {
				if (!res.headersSent) {
					return next(
						new AppError(
							ErrorCode.UNAUTHORIZED,
							`Invalid token or user doesn't exist`,
							401
						)
					);
				}
				return;
			}

			let sessionString: string | null;
			try {
				sessionString = await redisClient.get(decoded.sub);
			} catch (err) {
				if (!res.headersSent) {
					return next(err);
				}

				return;
			}

			if (!sessionString) {
				if (!res.headersSent) {
					return next(
						new AppError(
							ErrorCode.UNAUTHORIZED,
							'Invalid token or session has expired',
							401
						)
					);
				}
				return;
			}

			let sessionObj: { id: string };
			try {
				sessionObj = JSON.parse(sessionString) as { id: string };
			} catch {
				if (!res.headersSent) {
					return next(
						new AppError(
							ErrorCode.UNAUTHORIZED,
							'Invalid session format',
							401
						)
					);
				}
				return;
			}

			let userRecord = null;
			try {
				userRecord = await userService.findById(sessionObj.id);
			} catch (err) {
				if (!res.headersSent) {
					return next(err);
				}

				return;
			}

			if (!userRecord) {
				if (!res.headersSent) {
					return next(
						new AppError(
							ErrorCode.UNAUTHORIZED,
							'Invalid token or session has expired',
							401
						)
					);
				}
				return;
			}

			res.locals['user'] = userRecord;
			return next();
		} catch (err) {
			if (!res.headersSent) {
				next(err as Error);
			}
		}
	})();
};
