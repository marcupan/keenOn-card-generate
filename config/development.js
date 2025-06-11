export default {
	// Development-specific configuration
	origin: 'http://localhost:3000',
	port: 4000,
	accessTokenExpiresIn: 60, // Longer expiration for development
	refreshTokenExpiresIn: 120, // Longer expiration for development
	redisCacheExpiresIn: 60,
	emailFrom: 'dev-test@gmail.com',

	// Feature flag configuration for development
	featureFlags: {
		flags: {
			// Enable all feature flags in development
			'new-user-welcome': {
				name: 'new-user-welcome',
				description: 'Show welcome message for new users',
				enabled: true,
				type: 'boolean',
			},
			'enhanced-search': {
				name: 'enhanced-search',
				description: 'Enable enhanced search functionality',
				enabled: true, // Always enabled in development
				type: 'percentage',
				percentage: 100, // 100% in development
			},
			'beta-features': {
				name: 'beta-features',
				description: 'Enable beta features for specific users',
				enabled: true,
				type: 'userTargeting',
				targetedUserIds: ['user1', 'user2', 'admin1', 'developer'], // Additional developer user
			},
			'experimental-ui': {
				name: 'experimental-ui',
				description: 'Enable experimental UI components',
				enabled: true, // Enabled in development
				type: 'boolean',
			},
		},
	},

	// Development logging configuration
	logging: {
		level: 'debug',
		console: true,
		file: false,
	},
};
