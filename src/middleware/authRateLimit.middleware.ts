import rateLimit from 'express-rate-limit';

import { ErrorCode } from '../types/error';

export const authRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: 'error',
		code: ErrorCode.TOO_MANY_REQUESTS,
		message:
			'Too many authentication attempts from this IP, please try again after 15 minutes.',
	},
	skipSuccessfulRequests: false,
});

export const emailVerificationRateLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: 3,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: 'error',
		code: ErrorCode.TOO_MANY_REQUESTS,
		message:
			'Too many verification attempts from this IP, please try again after 1 hour.',
	},
});
