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
import authRouter from './routes/auth.routes';
import cardRoutes from './routes/card.routes';
import folderRoutes from './routes/folder.routes';
import staticRouter from './routes/static.routes';
import userRouter from './routes/user.routes';
import { ErrorCode } from './types/error';
import { AppError } from './utils/appError';
import redisClient from './utils/connectRedis';
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

let server: ReturnType<typeof express.application.listen>;

const gracefulShutdown = async (signal: string): Promise<void> => {
	Logger.info(`${signal} received. Initiating graceful shutdown...`);
	try {
		await Promise.all([
			server
				? new Promise((resolve) => server.close(resolve))
				: Promise.resolve(),
			AppDataSource.destroy(),
			redisClient.quit(),
		]);
		Logger.info('Cleanup completed. Server shutting down.');
		process.exit(0);
	} catch (error) {
		Logger.error('Error during shutdown:', error);
		process.exit(1);
	}
};

const healthCheck = (_: Request, res: Response): void => {
	void (async () => {
		try {
			const [redisStatus, dbCheck] = await Promise.all([
				redisClient.ping(),
				AppDataSource.query('SELECT 1'),
			]);

			return res.status(200).json({
				status: 'success',
				redis: redisStatus === 'PONG' ? 'connected' : 'disconnected',
				database: dbCheck ? 'connected' : 'disconnected',
			});
		} catch {
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
	_: Request,
	res: Response,
	__: NextFunction
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

async function startServer() {
	try {
		setupGlobalErrorHandlers();

		Logger.info('Initializing database...');
		await AppDataSource.initialize();
		Logger.info('Database initialized');

		validateEnv();

		const app = express();

		app.use((req, _res, next) => {
			console.log(`→ [${req.method}] ${req.originalUrl}`);
			next();
		});

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

		const port = config.get<number>('port') || 4000;
		server = app.listen(port, () => {
			Logger.info(`Server running on port: ${port}`);
		});

		process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
		process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
	} catch (error) {
		Logger.error('Server startup failed:', error);
		process.exit(1);
	}
}

void startServer();
