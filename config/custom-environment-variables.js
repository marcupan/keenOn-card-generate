export default {
	port: 'PORT',
	origin: 'CORS_ORIGIN',

	encryption: {
		key: 'ENCRYPTION_KEY',
	},

	backup: {
		directory: 'BACKUP_DIRECTORY',
	},

	accessTokenExpiresIn: 'ACCESS_TOKEN_EXPIRES_IN',
	refreshTokenExpiresIn: 'REFRESH_TOKEN_EXPIRES_IN',
	redisCacheExpiresIn: 'REDIS_CACHE_EXPIRES_IN',

	emailFrom: 'EMAIL_FROM',

	postgresConfig: {
		host: 'POSTGRES_HOST',
		port: 'POSTGRES_PORT',
		username: 'POSTGRES_USER',
		password: 'POSTGRES_PASSWORD',
		database: 'POSTGRES_DB',
	},

	redisConfig: {
		host: 'REDIS_HOST',
		port: 'REDIS_PORT',
		password: 'REDIS_PASSWORD',
	},

	grpcConfig: {
		hostTranslate: 'GRPC_HOST_TRANSLATE',
		hostCompose: 'GRPC_HOST_COMPOSE',
		portTranslate: 'GRPC_PORT_TRANSLATE',
		portCompose: 'GRPC_PORT_COMPOSE',
	},

	accessTokenPrivateKey: 'JWT_ACCESS_TOKEN_PRIVATE_KEY',
	accessTokenPublicKey: 'JWT_ACCESS_TOKEN_PUBLIC_KEY',
	refreshTokenPrivateKey: 'JWT_REFRESH_TOKEN_PRIVATE_KEY',
	refreshTokenPublicKey: 'JWT_REFRESH_TOKEN_PUBLIC_KEY',

	smtp: {
		host: 'EMAIL_HOST',
		pass: 'EMAIL_PASS',
		port: 'EMAIL_PORT',
		user: 'EMAIL_USER',
	},

	logging: {
		level: 'LOG_LEVEL',
		console: 'LOG_TO_CONSOLE',
		file: 'LOG_TO_FILE',
	},

	featureFlags: {
		flags: {
			'new-user-welcome': {
				enabled: 'FEATURE_FLAG_NEW_USER_WELCOME',
			},
			'enhanced-search': {
				enabled: 'FEATURE_FLAG_ENHANCED_SEARCH',
				percentage: 'FEATURE_FLAG_ENHANCED_SEARCH_PERCENTAGE',
			},
			'beta-features': {
				enabled: 'FEATURE_FLAG_BETA_FEATURES',
			},
			'experimental-ui': {
				enabled: 'FEATURE_FLAG_EXPERIMENTAL_UI',
			},
		},
	},
};
