import 'dotenv/config';
import 'reflect-metadata';
import config from 'config';
import { DataSource } from 'typeorm';

import '../entities';

const postgresConfig = config.get<{
	host: string;
	port: number;
	username: string;
	password: string;
	database: string;
}>('postgresConfig');

export const AppDataSource = new DataSource({
	...postgresConfig,
	type: 'postgres',
	synchronize: false,
	logging:
		process.env['NODE_ENV'] === 'development' ||
		process.env['DB_LOGGING'] === 'true',
	entities:
		process.env['NODE_ENV'] === 'production'
			? ['dist/src/entities/**/*.entity.js']
			: ['src/entities/**/*.entity.{ts,js}'],
	migrations:
		process.env['NODE_ENV'] === 'production'
			? ['dist/src/migrations/**/*.js']
			: ['src/migrations/**/*.{ts,js}'],
	subscribers:
		process.env['NODE_ENV'] === 'production'
			? ['dist/src/subscribers/**/*.js']
			: ['src/subscribers/**/*.{ts,js}'],
	poolSize: 10,
	connectTimeoutMS: 10000,
	maxQueryExecutionTime: 5000,
});
