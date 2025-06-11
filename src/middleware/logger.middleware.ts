import type { Request, Response, NextFunction } from 'express';

import Logger from '../utils/logger';

/**
 * Middleware for logging HTTP requests
 */
export const requestLogger = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	const start = Date.now();

	Logger.http(`Incoming request: ${req.method} ${req.originalUrl}`, {
		method: req.method,
		url: req.originalUrl,
		ip: req.ip,
		userAgent: req.get('user-agent'),
	});

	res.on('finish', () => {
		const duration = Date.now() - start;
		const logLevel = res.statusCode >= 400 ? 'error' : 'http';
		const logMethod = logLevel === 'error' ? Logger.error : Logger.http;

		logMethod(
			`Response sent: ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
			{
				method: req.method,
				url: req.originalUrl,
				statusCode: res.statusCode,
				duration,
			}
		);
	});

	next();
};

export default requestLogger;
