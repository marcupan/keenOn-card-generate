module.exports = {
	// Server configuration
	port: 'PORT',
	origin: 'CORS_ORIGIN',

	// Token expiration times
	accessTokenExpiresIn: 'ACCESS_TOKEN_EXPIRES_IN',
	refreshTokenExpiresIn: 'REFRESH_TOKEN_EXPIRES_IN',
	redisCacheExpiresIn: 'REDIS_CACHE_EXPIRES_IN',

	// Email configuration
	emailFrom: 'EMAIL_FROM',

	// Database configuration
	postgresConfig: {
		host: 'POSTGRES_HOST',
		port: 'POSTGRES_PORT',
		username: 'POSTGRES_USER',
		password: 'POSTGRES_PASSWORD',
		database: 'POSTGRES_DB',
	},

	// Redis configuration
	redisConfig: {
		host: 'REDIS_HOST',
		port: 'REDIS_PORT',
		password: 'REDIS_PASSWORD',
	},

	// gRPC configuration
	grpcConfig: {
		hostTranslate: 'GRPC_HOST_TRANSLATE',
		hostCompose: 'GRPC_HOST_COMPOSE',
		portTranslate: 'GRPC_PORT_TRANSLATE',
		portCompose: 'GRPC_PORT_COMPOSE',
	},

	// JWT configuration
	accessTokenPrivateKey: 'JWT_ACCESS_TOKEN_PRIVATE_KEY',
	accessTokenPublicKey: 'JWT_ACCESS_TOKEN_PUBLIC_KEY',
	refreshTokenPrivateKey: 'JWT_REFRESH_TOKEN_PRIVATE_KEY',
	refreshTokenPublicKey: 'JWT_REFRESH_TOKEN_PUBLIC_KEY',

	// SMTP configuration
	smtp: {
		host: 'EMAIL_HOST',
		pass: 'EMAIL_PASS',
		port: 'EMAIL_PORT',
		user: 'EMAIL_USER',
	},

	// Logging configuration
	logging: {
		level: 'LOG_LEVEL',
		console: 'LOG_TO_CONSOLE',
		file: 'LOG_TO_FILE',
	},

	// Feature flags can be controlled via environment variables
	// Format: FEATURE_FLAG_[FLAG_NAME]
	// Example: FEATURE_FLAG_EXPERIMENTAL_UI=true
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
