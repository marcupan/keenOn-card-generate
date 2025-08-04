import 'reflect-metadata';
import 'dotenv/config';

import path from 'path';

import compression from 'compression';
import config from 'config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import express from 'express';
import type { NextFunction, Request, Response } from 'express';

import apiVersionMiddleware from './middleware/apiVersion.middleware';
import {
	errorBoundary,
	setupGlobalErrorHandlers,
} from './middleware/errorBoundary.middleware';
import { featureFlagContext } from './middleware/featureFlag.middleware';
import { trackSuspiciousActivity } from './middleware/ipBlocking.middleware';
import requestLogger from './middleware/logger.middleware';
import { performanceMonitoring } from './middleware/performance.middleware';
import adminRouter from './routes/admin.router';
import apiKeyRoutes from './routes/apiKey.routes';
import authRouter from './routes/auth.routes';
import cardRoutes from './routes/card.routes';
import folderRoutes from './routes/folder.routes';
import staticRouter from './routes/static.routes';
import userRouter from './routes/user.routes';
import { ErrorCode } from './types/error';
import { AppError } from './utils/appError';
import { AppDataSource } from './utils/dataSource';
import Logger from './utils/logger';
import validateEnv from './utils/validateEnv';

const isDevelopment = process.env['NODE_ENV'] === 'development';

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: 'error',
		code: ErrorCode.TOO_MANY_REQUESTS,
		message: 'Too many requests from this IP, please try again later.',
	},
});

// Helper function to format uptime
const formatUptime = (uptime: number): string => {
	const days = Math.floor(uptime / 86400);
	const hours = Math.floor((uptime % 86400) / 3600);
	const minutes = Math.floor((uptime % 3600) / 60);
	const seconds = Math.floor(uptime % 60);

	return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

// Helper function to format bytes
const formatBytes = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const healthCheck = (_: Request, res: Response): void => {
	void (async () => {
		try {
			// Get system information
			const uptime = process.uptime();
			const memoryUsage = process.memoryUsage();
			const nodeVersion = process.version;
			const platform = process.platform;

			// Check database status with more details
			let dbStatus;
			let dbInfo;
			try {
				const dbCheck = await AppDataSource.query('SELECT 1');
				dbStatus = dbCheck ? 'connected' : 'disconnected';

				// Get database version and connection info if connected
				if (dbStatus === 'connected') {
					const versionResult =
						await AppDataSource.query('SELECT version()');
					const connectionCount = await AppDataSource.query(
						'SELECT count(*) as count FROM pg_stat_activity'
					);
					dbInfo = {
						version: versionResult[0].version,
						connections: connectionCount[0].count,
						type: AppDataSource.options.type,
						database: AppDataSource.options.database,
					};
				}
			} catch (error) {
				dbStatus = 'error';
				dbInfo = { error: (error as Error).message };
			}

			return res.status(200).json({
				status: 'success',
				timestamp: new Date().toISOString(),
				uptime: {
					seconds: uptime,
					formatted: formatUptime(uptime),
				},
				system: {
					platform,
					nodeVersion,
					memoryUsage: {
						rss: formatBytes(memoryUsage.rss),
						heapTotal: formatBytes(memoryUsage.heapTotal),
						heapUsed: formatBytes(memoryUsage.heapUsed),
						external: formatBytes(memoryUsage.external),
					},
				},
				services: {
					database: {
						status: dbStatus,
						info: dbInfo,
					},
				},
			});
		} catch (error) {
			Logger.error('Health check failed', error);
			throw new AppError(
				ErrorCode.SERVICE_UNAVAILABLE,
				'Health check failed',
				500
			);
		}
	})();
};

const errorHandler = (
	err: AppError,
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	console.error('Error:', err);

	const statusCode = err.statusCode || 500;
	const errorCode = err.code || ErrorCode.INTERNAL_SERVER_ERROR;

	if (res.headersSent) {
		console.warn('Headers already sent, cannot send error response');
		return;
	}

	res.status(statusCode).json({
		status: 'error',
		code: errorCode,
		message: err.message,
		...(isDevelopment && { stack: err.stack }),
	});
};

// Create and configure the Express application for testing
export async function createTestApp() {
	setupGlobalErrorHandlers();
	validateEnv();

	const app = express();

	app.use(
		compression({
			threshold: 1024,
			filter: (req, res) => {
				if (req.headers['x-no-compression']) {
					return false;
				}
				return compression.filter(req, res);
			},
			level: 6,
		})
	);

	app.use(
		helmet({
			crossOriginResourcePolicy: !isDevelopment,
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'self'"],
					styleSrc: ["'self'"],
					imgSrc: ["'self'", 'data:', 'blob:'],
					connectSrc: ["'self'"],
					fontSrc: ["'self'"],
					objectSrc: ["'none'"],
					mediaSrc: ["'self'"],
					frameSrc: ["'none'"],
				},
			},
			xssFilter: true,
			noSniff: true,
			hsts: {
				maxAge: 31536000,
				includeSubDomains: true,
				preload: true,
			},
			frameguard: { action: 'deny' },
			dnsPrefetchControl: { allow: false },
			hidePoweredBy: true,
			referrerPolicy: { policy: 'same-origin' },
		})
	);

	app.set('view engine', 'pug');
	app.set('views', path.join(__dirname, 'views'));

	if (!isDevelopment) {
		app.set('trust proxy', 1);
	}

	app.use(limiter);
	app.use(express.json({ limit: '2mb' }));
	app.use(express.urlencoded({ extended: true, limit: '2mb' }));
	app.use(cookieParser());
	app.use(
		cors({
			origin: config.get<string>('origin'),
			credentials: true,
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
			allowedHeaders: [
				'Content-Type',
				'Authorization',
				'X-CSRF-Token',
				'Cache-Control',
				'Pragma',
				'Expires',
			],
			exposedHeaders: ['X-CSRF-Token'],
		})
	);

	app.use(trackSuspiciousActivity);
	app.use(requestLogger);
	app.use(performanceMonitoring);
	app.use(featureFlagContext);

	app.use('/api', apiVersionMiddleware);

	app.use('/api/auth', authRouter);
	app.use('/api/user', userRouter);
	app.use('/api/cards', cardRoutes);
	app.use('/api/folders', folderRoutes);
	app.use('/api/admin', adminRouter);
	app.use('/api/api-keys', apiKeyRoutes);

	app.use(
		'/api/static',
		express.static(path.join(__dirname, '../public'), {
			extensions: ['jpg', 'jpeg', 'png'],
			maxAge: '1d',
			setHeaders: (res) => {
				res.set('Cache-Control', 'public, max-age=86400');
				res.set('Content-Security-Policy', "default-src 'self'");
				res.set('X-Content-Type-Options', 'nosniff');
				res.set('X-Frame-Options', 'DENY');
				res.set('Content-Disposition', 'inline');
			},
		})
	);
	app.use('/api/static', staticRouter);

	app.get('/api/health', healthCheck);

	app.all('*', (req: Request, _res: Response, next: NextFunction) =>
		next(
			new AppError(
				ErrorCode.NOT_FOUND,
				`Route ${req.originalUrl} not found`,
				404
			)
		)
	);

	app.use(errorBoundary);
	app.use(errorHandler);

	return app;
}
