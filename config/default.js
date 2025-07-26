export default {
	port: 4000,
	accessTokenExpiresIn: 15,
	refreshTokenExpiresIn: 60,
	redisCacheExpiresIn: 60,
	emailFrom: 'noreply@example.com',

	encryption: {
		key:
			process.env.ENCRYPTION_KEY ||
			'default-dev-key-do-not-use-in-production',
	},

	backup: {
		directory: process.env.BACKUP_DIRECTORY || 'backups',
	},

	postgresConfig: {
		host: 'localhost',
		port: 5432,
		username: 'postgres',
		password: 'postgres',
		database: 'keenon',
	},

	redisConfig: {
		host: 'localhost',
		port: 6379,
		password: '',
	},

	grpcConfig: {
		hostTranslate: 'localhost',
		hostCompose: 'localhost',
		portTranslate: 50051,
		portCompose: 50052,
	},

	featureFlags: {
		flags: {
			'new-user-welcome': {
				name: 'new-user-welcome',
				description: 'Show welcome message for new users',
				enabled: true,
				type: 'boolean',
			},

			'enhanced-search': {
				name: 'enhanced-search',
				description: 'Enable enhanced search functionality',
				enabled: true,
				type: 'percentage',
				percentage: 50,
			},

			'beta-features': {
				name: 'beta-features',
				description: 'Enable beta features for specific users',
				enabled: true,
				type: 'userTargeting',
				targetedUserIds: ['user1', 'user2', 'admin1'],
			},

			'experimental-ui': {
				name: 'experimental-ui',
				description: 'Enable experimental UI components',
				enabled: false,
				type: 'boolean',
			},
		},
	},

	logging: {
		level: 'info',
		console: true,
		file: false,
	},
};
