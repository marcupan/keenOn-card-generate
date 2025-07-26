export default {
	origin: 'http://localhost:3000',
	port: 4000,
	accessTokenExpiresIn: 60,
	refreshTokenExpiresIn: 120,
	redisCacheExpiresIn: 60,
	emailFrom: 'dev-test@gmail.com',

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
				targetedUserIds: ['user1', 'user2', 'admin1', 'developer'],
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
		level: 'debug',
		console: true,
		file: false,
	},
};
