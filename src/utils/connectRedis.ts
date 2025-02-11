import 'dotenv/config';
import config from 'config';
import { createClient } from 'redis';

const redisConfig = config.get<{
	host: string;
	port: number;
}>('redisConfig');

const redisUrl = `redis://${redisConfig.host}:${redisConfig.port}`;

const redisClient = createClient({
	url: redisUrl,
});

const connectRedis = async () => {
	try {
		await redisClient.connect();

		console.log('Redis client connected successfully');

		redisClient.set('try', 'Hello Welcome to Express with TypeORM');
	} catch (error) {
		console.log('Redis error', error);

		setTimeout(connectRedis, 5000);
	}
};

connectRedis();

export default redisClient;
