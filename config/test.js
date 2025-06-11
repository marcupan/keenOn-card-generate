export default {
	// Test-specific configuration
	origin: 'http://localhost:3000',
	port: 4001, // Different port for test environment
	accessTokenExpiresIn: 1, // Very short expiration for tests
	refreshTokenExpiresIn: 2,
	redisCacheExpiresIn: 1,
	emailFrom: 'test@example.com',

	// Test database configuration - can use in-memory or test-specific databases
	postgresConfig: {
		host: 'localhost',
		port: 5432,
		username: 'test_user',
		password: 'test_password',
		database: 'test_db',
	},

	// Test Redis configuration
	redisConfig: {
		host: 'localhost',
		port: 6379,
	},

	// Feature flag configuration for testing
	featureFlags: {
		flags: {
			// All flags enabled for comprehensive testing
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
				percentage: 100, // 100% in test
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
				enabled: true, // Enabled for testing
				type: 'boolean',
			},
		},
	},

	// Test logging configuration
	logging: {
		level: 'error', // Only log errors in tests
		console: true,
		file: false,
	},
};
