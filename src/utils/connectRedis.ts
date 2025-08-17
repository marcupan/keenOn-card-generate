import 'dotenv/config';
import config from 'config';
import { createClient } from 'redis';

import Logger from './logger';

interface RedisCfg {
	host: string;
	port: string | number;
	password?: string;
}

const { host, port: rawPort, password } = config.get<RedisCfg>('redisConfig');

const port = typeof rawPort === 'string' ? parseInt(rawPort, 10) : rawPort;

Logger.info(
	`→ Connecting to Redis at ${host}:${port} ${password ? 'with auth' : 'no auth'}`
);

const redisClient = createClient({
	socket: {
		host,
		port,
		connectTimeout: 5000,
		reconnectStrategy: (retries) =>
			Math.min(Math.pow(2, retries) * 100, 3000),
	},
	...(password ? { password } : {}),
});

redisClient.on('error', (err) => Logger.error('Redis Client Error', err));
redisClient.on('connect', () => Logger.info('Redis socket connected'));
redisClient.on('reconnecting', () => Logger.info('Redis reconnecting...'));
redisClient.on('ready', () => Logger.info('Redis client ready'));

void (async function connectWithRetry(retry = 0): Promise<void> {
	try {
		if (!redisClient.isOpen) {
			await redisClient.connect();

			Logger.info(`✅ Redis connected: ${redisClient.isOpen}`);
		}
	} catch (err) {
		Logger.error('❌ Redis connect failed', err);

		if (retry < 5) {
			const delay = 5000 * Math.pow(2, retry);
			Logger.info(`→ Retrying Redis connect in ${delay}ms…`);
			setTimeout(() => void connectWithRetry(retry + 1), delay);
		}
	}
})();

export default redisClient;
