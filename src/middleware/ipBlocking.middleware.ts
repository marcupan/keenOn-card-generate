import { AppError } from '@utils/appError';
import type { Request, Response, NextFunction } from 'express';

import { ErrorCode } from '../types/error';
import redisClient from '../utils/connectRedis';
import Logger from '../utils/logger';

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 60 * 60;
const SUSPICIOUS_ACTIVITY_THRESHOLD = 10;

/**
 * Middleware to track failed login attempts and block IPs with suspicious activity
 */
export const trackFailedLoginAttempts = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const ip = req.ip;

			const isBlocked = await redisClient.get(`blocked:${ip}`);
			if (isBlocked) {
				if (res.headersSent) {
					console.warn(
						'[DEBUG] trackFailedLoginAttempts - Headers already sent, cannot send blocked IP response'
					);
					return;
				}

				return next(
					new AppError(
						ErrorCode.FORBIDDEN,
						'Your IP has been blocked due to suspicious activity. Please try again later.',
						403
					)
				);
			}

			next();
		} catch (error) {
			Logger.error('Error in IP blocking middleware:', error);

			if (res.headersSent) {
				return;
			}

			next();
		}
	})();
};

/**
 * Function to increment failed login attempts for an IP
 * @param ip The IP address
 */
export const incrementFailedLoginAttempts = async (
	ip: string
): Promise<void> => {
	try {
		const key = `failed_login:${ip}`;
		const attempts = await redisClient.incr(key);

		if (attempts === 1) {
			await redisClient.expire(key, 24 * 60 * 60);
		}

		if (attempts >= MAX_FAILED_ATTEMPTS) {
			await redisClient.set(`blocked:${ip}`, '1', {
				EX: BLOCK_DURATION,
			});

			Logger.warn(
				`IP ${ip} has been blocked due to too many failed login attempts`
			);
		}
	} catch (error) {
		Logger.error('Error incrementing failed login attempts:', error);
	}
};

/**
 * Function to reset failed login attempts for an IP after successful login
 * @param ip The IP address
 */
export const resetFailedLoginAttempts = async (ip: string): Promise<void> => {
	try {
		const key = `failed_login:${ip}`;
		await redisClient.del(key);
	} catch (error) {
		Logger.error('Error resetting failed login attempts:', error);
	}
};

/**
 * Middleware to track suspicious activity across the application
 */
export const trackSuspiciousActivity = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	void (async () => {
		try {
			const ip = req.ip;
			const blockedKey = `blocked:${ip}`;
			const counterKey = `suspicious:${ip}`;

			const isBlocked = await redisClient.get(blockedKey);
			if (isBlocked) {
				if (res.headersSent) {
					Logger.warn(
						'[trackSuspiciousActivity] Headers already sent; cannot send blocked response'
					);
					return;
				}

				return next(
					new AppError(
						ErrorCode.FORBIDDEN,
						'Your IP has been blocked due to excessive requests. Please try again later.',
						403
					)
				);
			}

			const count = await redisClient.incr(counterKey);

			if (count === 1) {
				await redisClient.expire(counterKey, 60);
			}

			if (count > SUSPICIOUS_ACTIVITY_THRESHOLD) {
				await redisClient.set(blockedKey, '1', {
					EX: BLOCK_DURATION,
				});

				Logger.warn(
					`IP ${ip} blocked for suspicious activity (count=${count})`
				);

				if (res.headersSent) {
					Logger.warn(
						'[trackSuspiciousActivity] Headers already sent; cannot send blocked response'
					);
					return;
				}

				return next(
					new AppError(
						ErrorCode.FORBIDDEN,
						'Your IP has been blocked due to excessive requests. Please try again later.',
						403
					)
				);
			}

			return next();
		} catch (err) {
			Logger.error('Error in trackSuspiciousActivity middleware:', err);

			if (res.headersSent) {
				Logger.warn(
					'[trackSuspiciousActivity] Headers already sent; cannot propagate error'
				);
				return;
			}

			return next();
		}
	})();
};
