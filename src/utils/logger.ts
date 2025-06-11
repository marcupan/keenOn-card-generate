import winston from 'winston';
import 'dotenv/config';

const levels = {
	error: 0,
	warn: 1,
	info: 2,
	http: 3,
	debug: 4,
};

const level = () => {
	const env = process.env['NODE_ENV'] ?? 'development';
	return env === 'development' ? 'debug' : 'info';
};

const colors = {
	error: 'red',
	warn: 'yellow',
	info: 'green',
	http: 'magenta',
	debug: 'white',
};

winston.addColors(colors);

const consoleFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
	winston.format.colorize({ all: true }),
	winston.format.printf(
		(info) => `${info['timestamp']} ${info.level}: ${info.message}`
	)
);

const fileFormat = winston.format.combine(
	winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
	winston.format.json()
);

const transports = [
	new winston.transports.Console({
		format: consoleFormat,
	}),
	new winston.transports.File({
		filename: 'logs/error.log',
		level: 'error',
		format: fileFormat,
	}),
	new winston.transports.File({
		filename: 'logs/all.log',
		format: fileFormat,
	}),
];

const logger = winston.createLogger({
	level: level(),
	levels,
	transports,
});

class Logger {
	static error(message: string, meta?: unknown): void {
		logger.error(message, meta);
	}

	static warn(message: string, meta?: unknown): void {
		logger.warn(message, meta);
	}

	static info(message: string, meta?: unknown): void {
		logger.info(message, meta);
	}

	static http(message: string, meta?: unknown): void {
		logger.http(message, meta);
	}

	static debug(message: string, meta?: unknown): void {
		logger.debug(message, meta);
	}

	static getLogger(context: string) {
		return {
			error: (message: string, meta?: unknown) =>
				Logger.error(`[${context}] ${message}`, meta),
			warn: (message: string, meta?: unknown) =>
				Logger.warn(`[${context}] ${message}`, meta),
			info: (message: string, meta?: unknown) =>
				Logger.info(`[${context}] ${message}`, meta),
			http: (message: string, meta?: unknown) =>
				Logger.http(`[${context}] ${message}`, meta),
			debug: (message: string, meta?: unknown) =>
				Logger.debug(`[${context}] ${message}`, meta),
		};
	}
}

export default Logger;
