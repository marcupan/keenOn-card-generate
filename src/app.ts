import 'dotenv/config';
import path from 'path';

import config from 'config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import adminRouter from './routes/admin.router';
import authRouter from './routes/auth.routes';
import cardRoutes from './routes/card.routes';
import folderRoutes from './routes/folder.routes';
import staticRouter from './routes/static.routes';
import userRouter from './routes/user.routes';
import { ErrorType } from './types/error';
import AppError from './utils/appError';
import redisClient from './utils/connectRedis';
import { AppDataSource } from './utils/dataSource';
import validateEnv from './utils/validateEnv';

const isDevelopment = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 100,
});

async function startServer() {
	try {
		console.log('Initializing database...');

		await AppDataSource.initialize();

		console.log('Database initialized');

		validateEnv();

		const app = express();

		app.set('view engine', 'pug');
		app.set('views', path.join(__dirname, 'views'));

		if (!isDevelopment) {
			app.set('trust proxy', 1);
		}

		app.use(
			helmet({
				crossOriginResourcePolicy: !isDevelopment, // TODO: Remove after DEV
			})
		);

		app.use(limiter);
		app.use(express.json({ limit: '10kb' }));

		if (isDevelopment) {
			app.use(morgan('dev'));
		}

		app.use(cookieParser());

		app.use(
			cors({
				origin: config.get<string>('origin'),
				credentials: true,
			})
		);

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
					res.set('Content-Security-Policy', "default-src 'self'");
					res.set('X-Content-Type-Options', 'nosniff');
					res.set('X-Frame-Options', 'DENY');
					res.set('Content-Disposition', 'inline');
				},
			}),
			staticRouter
		);

		app.get('/api/health', async (_, res: Response) => {
			try {
				const redisStatus = await redisClient.ping();
				const dbCheck = await AppDataSource.query('SELECT 1');

				res.status(200).json({
					status: 'success',
					redis:
						redisStatus === 'PONG' ? 'connected' : 'disconnected',
					database: dbCheck ? 'connected' : 'disconnected',
				});
			} catch (err: unknown) {
				const error = err as ErrorType;

				res.status(500).json({
					status: 'error',
					message: 'Health check failed',
					error: error.message,
				});
			}
		});

		app.all('*', (req: Request, _: Response, next: NextFunction) => {
			next(new AppError(404, `Route ${req.originalUrl} not found`));
		});

		app.use(
			(error: AppError, _: Request, res: Response, __: NextFunction) => {
				console.error('Error:', error.stack);

				res.status(error.statusCode || 500).json({
					status: error.status || 'error',
					message: error.message,
				});
			}
		);

		const port = config.get<number>('port') || 4000;
		const server = app.listen(port, () => {
			console.log(`Server running on port: ${port}`);
		});

		process.on('SIGTERM', async () => {
			console.log('SIGTERM received. Closing server...');

			server.close(() => console.log('Server closed.'));

			await AppDataSource.destroy();
			await redisClient.quit();

			process.exit(0);
		});

		process.on('SIGINT', async () => {
			console.log('SIGINT received. Closing server...');

			server.close(() => console.log('Server closed.'));

			await AppDataSource.destroy();
			await redisClient.quit();

			process.exit(0);
		});
	} catch (error) {
		console.error('Server startup failed:', error);

		process.exit(1);
	}
}

startServer();
