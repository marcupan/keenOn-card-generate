import { NextFunction, Request, Response } from 'express';

import { findUserById } from '../service/user.service';
import { ErrorCode } from '../types/error';
import { AppError } from '../utils/appError';
import redisClient from '../utils/connectRedis';
import { verifyJwt } from '../utils/jwt';

export const deserializeUser = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const access_token = req.cookies.access_token;

		if (!access_token) {
			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					'You are not logged in',
					401
				)
			);
		}

		const decoded = verifyJwt<{ sub: string }>(
			access_token,
			'accessTokenPublicKey'
		);

		if (!decoded) {
			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					`Invalid token or user doesn't exist`,
					401
				)
			);
		}

		const session = await redisClient.get(decoded.sub);

		if (!session) {
			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					`Invalid token or session has expired`,
					401
				)
			);
		}

		const user = await findUserById(JSON.parse(session).id);

		if (!user) {
			return next(
				new AppError(
					ErrorCode.UNAUTHORIZED,
					`Invalid token or session has expired`,
					401
				)
			);
		}

		res.locals.user = user;

		next();
	} catch (err: unknown) {
		next(err);
	}
};
