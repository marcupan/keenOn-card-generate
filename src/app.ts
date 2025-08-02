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
} from '@middleware/errorBoundary.middleware';
import { featureFlagContext } from '@middleware/featureFlag.middleware';
import { trackSuspiciousActivity } from '@middleware/ipBlocking.middleware';
import { performanceMonitoring } from '@middleware/performance.middleware';
import { AppError } from '@utils/appError';

import requestLogger from './middleware/logger.middleware';
import adminRouter from './routes/admin.router';
import apiKeyRoutes from './routes/apiKey.routes';
import authRouter from './routes/auth.routes';
import cardRoutes from './routes/card.routes';
import folderRoutes from './routes/folder.routes';
import staticRouter from './routes/static.routes';
import userRouter from './routes/user.routes';
import { ErrorCode } from './types/error';
import redisClient from './utils/connectRedis';
import { AppDataSource } from '@utils/dataSource';
import Logger from './utils/logger';
import validateEnv from './utils/validateEnv';

interface RedisInfoSuccess {
	[key: string]: string;
}

interface RedisInfoError {
	error: string;
}

type RedisInfo = RedisInfoSuccess | RedisInfoError | string | undefined;

interface DbInfoSuccess {
	version: string;
	connections: number;
	type: string;
	database?: string | undefined;
}

interface DbInfoError {
	error: string;
}

type DbInfo = DbInfoSuccess | DbInfoError | undefined;

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

/**
 * Get system information for health check
 */
const getSystemInfo = () => {
	const uptime = process.uptime();
	const memoryUsage = process.memoryUsage();

	const nodeVersion = process.version;
	const platform = process.platform;

	return {
		uptime,
		memoryUsage,
		nodeVersion,
		platform,
	};
};

/**
 * Check Redis status and get info
 */
const checkRedisStatus = async () => {
	try {
		const pingResult = await redisClient.ping();
		const redisStatus =
			pingResult === 'PONG' ? 'connected' : 'disconnected';

		let redisInfo;

		if (redisStatus === 'connected') {
			redisInfo = await redisClient.info();
		}

		return { redisStatus, redisInfo };
	} catch (error) {
		return {
			redisStatus: 'error',
			redisInfo: { error: (error as Error).message },
		};
	}
};

/**
 * Check database status and get info
 */
const checkDatabaseStatus = async () => {
	try {
		const dbCheck = await AppDataSource.query('SELECT 1');
		const dbStatus = dbCheck ? 'connected' : 'disconnected';

		let dbInfo;

		if (dbStatus === 'connected') {
			const versionResult = await AppDataSource.query('SELECT version()');
			const connectionCount = await AppDataSource.query(
				'SELECT count(*) as count FROM pg_stat_activity'
			);

			const dbName = AppDataSource.options.database;
			const databaseName =
				typeof dbName === 'string'
					? dbName
					: dbName instanceof Uint8Array
						? new TextDecoder().decode(dbName)
						: undefined;

			dbInfo = {
				version: versionResult[0].version,
				connections: connectionCount[0].count,
				type: AppDataSource.options.type,
				database: databaseName,
			};
		}

		return { dbStatus, dbInfo };
	} catch (error) {
		return {
			dbStatus: 'error',
			dbInfo: { error: (error as Error).message },
		};
	}
};

/**
 * Format health check response
 */
const formatHealthCheckResponse = (
	systemInfo: ReturnType<typeof getSystemInfo>,
	redisStatus: string,
	redisInfo: RedisInfo,
	dbStatus: string,
	dbInfo: DbInfo
) => {
	return {
		status: 'success',
		timestamp: new Date().toISOString(),
		uptime: {
			seconds: systemInfo.uptime,
			formatted: formatUptime(systemInfo.uptime),
		},
		system: {
			platform: systemInfo.platform,
			nodeVersion: systemInfo.nodeVersion,
			memoryUsage: {
				rss: formatBytes(systemInfo.memoryUsage.rss),
				heapTotal: formatBytes(systemInfo.memoryUsage.heapTotal),
				heapUsed: formatBytes(systemInfo.memoryUsage.heapUsed),
				external: formatBytes(systemInfo.memoryUsage.external),
			},
		},
		services: {
			redis: {
				status: redisStatus,
				info: redisInfo,
			},
			database: {
				status: dbStatus,
				info: dbInfo,
			},
		},
	};
};

/**
 * Health check endpoint handler
 */
const healthCheck = (_: Request, res: Response): void => {
	void (async () => {
		try {
			const systemInfo = getSystemInfo();

			const { redisStatus, redisInfo } = await checkRedisStatus();

			const { dbStatus, dbInfo } = await checkDatabaseStatus();

			return res
				.status(200)
				.json(
					formatHealthCheckResponse(
						systemInfo,
						redisStatus,
						redisInfo,
						dbStatus,
						dbInfo
					)
				);
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

const formatUptime = (uptime: number): string => {
	const days = Math.floor(uptime / 86400);
	const hours = Math.floor((uptime % 86400) / 3600);
	const minutes = Math.floor((uptime % 3600) / 60);
	const seconds = Math.floor(uptime % 60);

	return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

/**
 * Get helmet configuration
 */
const getHelmetConfig = () => {
	return {
		crossOriginResourcePolicy: isDevelopment
			? false
			: { policy: 'cross-origin' as const },
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
		frameguard: { action: 'deny' as const },
		dnsPrefetchControl: { allow: false },
		hidePoweredBy: true,
		referrerPolicy: { policy: 'same-origin' as const },
	};
};

/**
 * Get CORS configuration
 */
const getCorsConfig = () => {
	return {
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
	};
};

/**
 * Get compression configuration
 */
const getCompressionConfig = () => {
	return {
		threshold: 1024,
		filter: (req: Request, res: Response) => {
			if (req.headers['x-no-compression']) {
				return false;
			}
			return compression.filter(req, res);
		},
		level: 6,
	};
};

/**
 * Get static files configuration
 */
const getStaticFilesConfig = () => {
	return {
		extensions: ['jpg', 'jpeg', 'png'],
		maxAge: '1d',
		setHeaders: (res: Response) => {
			res.set('Cache-Control', 'public, max-age=86400');
			res.set('Content-Security-Policy', "default-src 'self'");
			res.set('X-Content-Type-Options', 'nosniff');
			res.set('X-Frame-Options', 'DENY');
			res.set('Content-Disposition', 'inline');
		},
	};
};

/**
 * Configure Express application settings
 */
const configureAppSettings = (app: express.Application) => {
	app.set('view engine', 'pug');
	app.set('views', path.join(__dirname, 'views'));

	if (!isDevelopment) {
		app.set('trust proxy', 1);
	}
};

/**
 * Configure Express middleware
 */
const configureMiddleware = (app: express.Application) => {
	app.use((req, _res, next) => {
		console.log(`→ [${req.method}] ${req.originalUrl}`);
		next();
	});

	app.use(compression(getCompressionConfig()));
	app.use(helmet(getHelmetConfig()));
	app.use(limiter);
	app.use(express.json({ limit: '2mb' }));
	app.use(express.urlencoded({ extended: true, limit: '2mb' }));
	app.use(cookieParser());
	app.use(cors(getCorsConfig()));

	app.use(trackSuspiciousActivity);
	app.use(requestLogger);
	app.use(performanceMonitoring);
	app.use(featureFlagContext);
};

/**
 * Configure API routes
 */
const configureRoutes = (app: express.Application) => {
	app.use('/api', apiVersionMiddleware);

	app.use('/api/auth', authRouter);
	app.use('/api/user', userRouter);
	app.use('/api/cards', cardRoutes);
	app.use('/api/folders', folderRoutes);
	app.use('/api/admin', adminRouter);
	app.use('/api/api-keys', apiKeyRoutes);

	app.use(
		'/api/static',
		express.static(
			path.join(__dirname, '../public'),
			getStaticFilesConfig()
		)
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
};

/**
 * Configure error handling
 */
const configureErrorHandling = (app: express.Application) => {
	app.use(errorBoundary);
	app.use(errorHandler);
};

/**
 * Initialize database connection
 */
const initializeDatabase = async () => {
	Logger.info('Initializing database...');
	await AppDataSource.initialize();
	Logger.info('Database initialized');
};

/**
 * Start the HTTP server
 */
const startHttpServer = (app: express.Application) => {
	const port = config.get<number>('port') || 4000;
	server = app.listen(port, () => {
		Logger.info(`Server running on port: ${port}`);
	});
};

/**
 * Configure signal handlers for graceful shutdown
 */
const configureSignalHandlers = () => {
	process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
	process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
};

/**
 * Main server initialization function
 */
async function startServer() {
	try {
		setupGlobalErrorHandlers();

		await initializeDatabase();

		validateEnv();

		const app = express();

		configureAppSettings(app);
		configureMiddleware(app);
		configureRoutes(app);
		configureErrorHandling(app);

		startHttpServer(app);

		configureSignalHandlers();
	} catch (error) {
		Logger.error('Server startup failed:', error);
		process.exit(1);
	}
}

void startServer();
