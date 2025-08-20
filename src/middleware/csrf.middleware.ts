import { doubleCsrf } from 'csrf-csrf';

import type { Request, Response, NextFunction } from 'express';

import { ErrorCode } from '../types/error';
import Logger from '../utils/logger';

const { generateToken, doubleCsrfProtection } = doubleCsrf({
	getSecret: () => 'your-secret-key',
	cookieName: 'csrf-token',
	cookieOptions: {
		httpOnly: true,
		secure: process.env['NODE_ENV'] === 'production',
		sameSite: 'lax',
	},
	size: 64,
	ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

export const handleCsrfError = (
	err: Error & { code?: string },
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (
		err.code === 'CSRF_INVALID' ||
		err.code === 'EBADCSRFTOKEN' ||
		err.message.includes('invalid csrf token')
	) {
		Logger.warn('CSRF validation failed', {
			path: req.path,
			method: req.method,
			ip: req.ip,
			headersSent: res.headersSent,
			error: err.message,
			errorCode: err.code,
		});

		if (!res.headersSent) {
			res.status(403).json({
				status: 'error',
				code: ErrorCode.FORBIDDEN,
				message: 'Invalid CSRF token. Please try again.',
			});

			return;
		}

		Logger.error('Headers already sent when handling CSRF error', {
			path: req.path,
			method: req.method,
		});

		return;
	}

	if (res.headersSent) {
		Logger.error('Headers already sent when handling non-CSRF error', {
			path: req.path,
			method: req.method,
			error: err.message,
			errorCode: err.code,
		});

		return;
	}

	return next(err);
};

export const generateCsrfToken = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (res.headersSent) {
		return next();
	}

	try {
		res.locals['csrfToken'] = generateToken(req, res);

		next();
	} catch (error) {
		if (!res.headersSent) {
			next(error);
		} else {
			next();
		}
	}
};

export const setCsrfToken = (
	_req: Request,
	res: Response,
	next: NextFunction
): void => {
	try {
		if (res.headersSent) {
			return;
		}

		res.set(
			'Cache-Control',
			'no-store, no-cache, must-revalidate, proxy-revalidate'
		);

		const token = res.locals['csrfToken'] as string;
		res.set('X-CSRF-Token', token);

		res.status(200).json({
			status: 'success',
			csrfToken: token,
		});
	} catch (err: unknown) {
		if (!res.headersSent) {
			next(err);
		}
	}
};

const csrfProtection = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
		return next();
	}

	Logger.debug('Applying CSRF protection', {
		path: req.path,
		method: req.method,
		hasToken: !!req.headers['x-csrf-token'] || !!req.body?.['_csrf'],
	});

	try {
		const nextWrapper = (err?: unknown) => {
			if (err) {
				const error = err as Error & { code?: string };

				Logger.debug('CSRF protection error caught in nextWrapper', {
					errorCode: error?.code,
					errorMessage: error.message,
				});

				handleCsrfError(error, req, res, next);

				return;
			}

			Logger.debug('CSRF validation passed');

			next();
		};

		doubleCsrfProtection(req, res, nextWrapper);
	} catch (error) {
		Logger.debug('CSRF protection synchronous error caught', {
			errorMessage: (error as Error).message,
		});

		handleCsrfError(error as Error & { code?: string }, req, res, next);
	}
};

export default csrfProtection;
