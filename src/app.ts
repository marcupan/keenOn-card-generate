import 'dotenv/config';
import config from 'config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { ComposeRequest } from '../proto/compose';
import { TranslationRequest } from '../proto/translation';

import adminRouter from './routes/admin.router';
import authRouter from './routes/auth.routes';
import cardRoutes from './routes/card.routes';
import folderRoutes from './routes/folder.routes';
import staticRouter from './routes/static.routes';
import userRouter from './routes/user.routes';
import AppError from './utils/appError';
import composeClient from './utils/composeClient';
import redisClient from './utils/connectRedis';
import { AppDataSource } from './utils/dataSource';
import translationClient from './utils/translationClient';
import validateEnv from './utils/validateEnv';

const isDevelopment = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 100,
});

AppDataSource.initialize()
	.then(async () => {
		validateEnv();

		const app = express();

		app.set('view engine', 'pug');
		app.set('views', `${__dirname}/views`);

		app.use(
			helmet({
				// TODO: Remove after DEV, test deployed with Docker
				crossOriginResourcePolicy: !isDevelopment,
			})
		);

		app.use(limiter);

		app.use(express.json({ limit: '10kb' }));

		// eslint-disable-next-line promise/always-return
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
			express.static(__dirname + '../public', {
				extensions: ['jpg', 'jpeg', 'png'],
				maxAge: '1d',
				setHeaders: function (res) {
					res.set('Content-Security-Policy', "default-src 'self'");
					res.set('X-Content-Type-Options', 'nosniff');
					res.set('X-Frame-Options', 'DENY');
					res.set('Content-Disposition', 'inline');
				},
			}),
			staticRouter
		);

		app.get('/api/health', async (_, res: Response) => {
			const message = await redisClient.get('try');

			res.status(200).json({
				status: 'success',
				message,
			});
		});

		app.post('/api/translate', async (req, res) => {
			try {
				const { chineseWord } = req.body;

				if (!chineseWord) {
					return res
						.status(400)
						.json({ error: 'Chinese word is required' });
				}

				const request: TranslationRequest = { chineseWord };

				const response = await translationClient.Translate(request);

				res.status(200).json({
					status: 'success',
					translation: response.translation,
					individualTranslations: response.individualTranslations,
				});
			} catch (err) {
				console.error('Error calling gRPC server:', err);

				res.status(500).json({
					status: 'error',
					message: 'Translation failed',
				});
			}
		});

		app.post('/api/compose', async (req, res) => {
			try {
				const { imageBase64, text } = req.body;

				if (!imageBase64 && !text) {
					return res
						.status(400)
						.json({ error: 'Image and text is required' });
				}

				const request: ComposeRequest = {
					imageBase64,
					text,
				};

				const response = await composeClient.ComposeImage(request);

				const composedImageBase64 = Buffer.from(
					response.composedImage
				).toString('base64');

				res.status(200).json({
					status: 'success',
					composed_image: composedImageBase64,
				});
			} catch (err) {
				console.error('Error:', err);

				res.status(500).json({
					status: 'error',
					message: 'An error occurred',
				});
			}
		});

		app.post('/api/generate-card', async (req, res) => {
			try {
				const { chineseWord, imageBase64 } = req.body;

				if (!chineseWord) {
					return res
						.status(400)
						.json({ error: 'Chinese word is required' });
				}

				const translationRequest = { chineseWord };
				const translationResponse =
					await translationClient.Translate(translationRequest);

				const translation = translationResponse.translation;
				const individualTranslations =
					translationResponse.individualTranslations;

				if (!imageBase64) {
					return res.status(400).json({ error: 'Image is required' });
				}

				const composeRequest = {
					imageBase64,
					text: translation,
				};
				const composeResponse =
					await composeClient.ComposeImage(composeRequest);

				const composedImageBase64 = Buffer.from(
					composeResponse.composedImage
				).toString('base64');

				res.status(200).json({
					status: 'success',
					composedImage: composedImageBase64,
					translation,
					individualTranslations,
				});
			} catch (err) {
				console.error('Error:', err);

				res.status(500).json({
					status: 'error',
					message: 'An error occurred',
				});
			}
		});

		app.all('*', (req: Request, _: Response, next: NextFunction) => {
			next(new AppError(404, `Route ${req.originalUrl} not found`));
		});

		app.use(
			(error: AppError, _: Request, res: Response, __: NextFunction) => {
				error.status = error.status || 'error';
				error.statusCode = error.statusCode || 500;

				console.log(error);

				res.status(error.statusCode).json({
					status: error.status,
					message: error.message,
				});
			}
		);

		const port = config.get<number>('port');
		app.listen(port);

		console.log(`Server started on port: ${port}`);
	})
	.catch((error) => console.log(error));
