export default {
	origin: 'http://localhost:3000',
	port: 4001,
	accessTokenExpiresIn: 1,
	refreshTokenExpiresIn: 2,
	redisCacheExpiresIn: 1,
	emailFrom: 'test@example.com',

	postgresConfig: {
		host: 'localhost',
		port: 5432,
		username: 'test_user',
		password: 'test_password',
		database: 'test_db',
	},

	redisConfig: {
		host: 'localhost',
		port: 6379,
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
				percentage: 100,
			},
			'beta-features': {
				name: 'beta-features',
				description: 'Enable beta features for specific users',
				enabled: true,
				type: 'userTargeting',
				targetedUserIds: ['test_user', 'admin1'],
			},
			'experimental-ui': {
				name: 'experimental-ui',
				description: 'Enable experimental UI components',
				enabled: true,
				type: 'boolean',
			},
		},
	},

	logging: {
		level: 'error',
		console: true,
		file: false,
	},
};
