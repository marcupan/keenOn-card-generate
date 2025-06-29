module.exports = {
	// Default configuration values common across all environments
	port: 4000,
	accessTokenExpiresIn: 15,
	refreshTokenExpiresIn: 60,
	redisCacheExpiresIn: 60,
	emailFrom: 'noreply@example.com',

	// Encryption configuration
	encryption: {
		key: process.env.ENCRYPTION_KEY || 'default-dev-key-do-not-use-in-production'
	},

	// Backup configuration
	backup: {
		directory: process.env.BACKUP_DIRECTORY || 'backups'
	},

	// Default database configuration
	postgresConfig: {
		host: 'localhost',
		port: 5432,
		username: 'postgres',
		password: 'postgres',
		database: 'keenon',
	},

	// Default Redis configuration
	redisConfig: {
		host: 'localhost',
		port: 6379,
		password: '', // Empty string for no password by default
	},

	// Default gRPC configuration
	grpcConfig: {
		hostTranslate: 'localhost',
		hostCompose: 'localhost',
		portTranslate: 50051,
		portCompose: 50052,
	},

	// Default feature flag configuration
	featureFlags: {
		flags: {
			// Simple boolean feature flag
			'new-user-welcome': {
				name: 'new-user-welcome',
				description: 'Show welcome message for new users',
				enabled: true,
				type: 'boolean',
			},

			// Percentage rollout feature flag
			'enhanced-search': {
				name: 'enhanced-search',
				description: 'Enable enhanced search functionality',
				enabled: true,
				type: 'percentage',
				percentage: 50, // Enable for 50% of requests
			},

			// User targeting feature flag
			'beta-features': {
				name: 'beta-features',
				description: 'Enable beta features for specific users',
				enabled: true,
				type: 'userTargeting',
				targetedUserIds: ['user1', 'user2', 'admin1'], // Enable only for these users
			},

			// Disabled feature flag
			'experimental-ui': {
				name: 'experimental-ui',
				description: 'Enable experimental UI components',
				enabled: false, // Globally disabled
				type: 'boolean',
			},
		},
	},

	// Default logging configuration
	logging: {
		level: 'info',
		console: true,
		file: false,
	},
};
