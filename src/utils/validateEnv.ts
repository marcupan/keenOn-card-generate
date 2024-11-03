import { cleanEnv, port, str } from 'envalid';

const validateEnv = () => {
	cleanEnv(process.env, {
		PORT: port(),
		NODE_ENV: str(),

		POSTGRES_HOST: str(),
		POSTGRES_PORT: port(),
		POSTGRES_USER: str(),
		POSTGRES_PASSWORD: str(),
		POSTGRES_DB: str(),

		REDIS_HOST: str(),
		REDIS_PORT: port(),

		EMAIL_USER: str(),
		EMAIL_PASS: str(),
		EMAIL_HOST: str(),
		EMAIL_PORT: port(),

		JWT_ACCESS_TOKEN_PRIVATE_KEY: str(),
		JWT_ACCESS_TOKEN_PUBLIC_KEY: str(),
		JWT_REFRESH_TOKEN_PRIVATE_KEY: str(),
		JWT_REFRESH_TOKEN_PUBLIC_KEY: str(),
	});
};

export default validateEnv;
