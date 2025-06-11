export default {
	// Production-specific configuration
	origin: 'https://keenon-app.example.com', // Production domain
	port: process.env.PORT ?? 4000,
	accessTokenExpiresIn: 15, // Shorter expiration for security
	refreshTokenExpiresIn: 60,
	redisCacheExpiresIn: 60,
	emailFrom: 'noreply@keenon-app.example.com', // Production email

	// Feature flag configuration for production
	featureFlags: {
		flags: {
			// Carefully controlled feature flags in production
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
				percentage: 50, // Gradual rollout in production
			},
			'beta-features': {
				name: 'beta-features',
				description: 'Enable beta features for specific users',
				enabled: true,
				type: 'userTargeting',
				targetedUserIds: ['user1', 'user2', 'admin1'], // Only specific users
			},
			'experimental-ui': {
				name: 'experimental-ui',
				description: 'Enable experimental UI components',
				enabled: false, // Disabled in production
				type: 'boolean',
			},
		},
	},

	// Production logging configuration
	logging: {
		level: 'info', // Less verbose in production
		console: false,
		file: true,
	},
};
