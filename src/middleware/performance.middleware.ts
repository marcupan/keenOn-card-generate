import type { NextFunction, Request, Response } from 'express';

import Logger from '../utils/logger';

const SLOW_REQUEST_THRESHOLD = 1000;

/**
 * Middleware to track response times and log slow requests
 */
export const performanceMonitoring = (
	req: Request,
	res: Response,
	next: NextFunction
): void => {
	if (req.path === '/api/health' || req.path.startsWith('/api/static')) {
		return next();
	}

	const start = process.hrtime();

	const logResponseTime = () => {
		const end = process.hrtime(start);
		const responseTimeMs = end[0] * 1000 + end[1] / 1000000;

		if (!res.headersSent) {
			try {
				res.setHeader(
					'X-Response-Time',
					`${responseTimeMs.toFixed(2)}ms`
				);
			} catch (error) {
				Logger.debug('Could not set X-Response-Time header', {
					error: (error as Error).message,
				});
			}
		}

		if (responseTimeMs > SLOW_REQUEST_THRESHOLD) {
			Logger.warn(
				`Slow request: ${req.method} ${req.originalUrl} - ${responseTimeMs.toFixed(2)}ms`,
				{
					method: req.method,
					url: req.originalUrl,
					responseTime: responseTimeMs,
					statusCode: res.statusCode,
					userAgent: req.headers['user-agent'],
					ip: req.ip,
					userId: res.locals['user']?.id ?? 'anonymous',
					headersSent: res.headersSent,
				}
			);
		}

		Logger.debug(
			`Request completed: ${req.method} ${req.originalUrl} - ${responseTimeMs.toFixed(2)}ms`
		);
	};

	res.on('finish', logResponseTime);

	next();
};

/**
 * Track memory usage and log if it exceeds thresholds
 */
export const monitorMemoryUsage = (): void => {
	const MEMORY_CHECK_INTERVAL = 60000;
	const WARNING_THRESHOLD = 0.7;
	const CRITICAL_THRESHOLD = 0.85;

	setInterval(() => {
		const memoryUsage = process.memoryUsage();
		const usedHeapSize = memoryUsage.heapUsed / 1024 / 1024;
		const totalHeapSize = memoryUsage.heapTotal / 1024 / 1024;
		const usageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

		Logger.debug(
			`Memory usage: ${usedHeapSize.toFixed(2)}MB / ${totalHeapSize.toFixed(2)}MB (${(usageRatio * 100).toFixed(2)}%)`
		);

		if (usageRatio > CRITICAL_THRESHOLD) {
			Logger.error(
				`CRITICAL: High memory usage: ${usedHeapSize.toFixed(2)}MB / ${totalHeapSize.toFixed(2)}MB (${(usageRatio * 100).toFixed(2)}%)`
			);
		} else if (usageRatio > WARNING_THRESHOLD) {
			Logger.warn(
				`WARNING: Elevated memory usage: ${usedHeapSize.toFixed(2)}MB / ${totalHeapSize.toFixed(2)}MB (${(usageRatio * 100).toFixed(2)}%)`
			);
		}
	}, MEMORY_CHECK_INTERVAL);
};
