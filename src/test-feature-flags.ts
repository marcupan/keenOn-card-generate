import express from 'express';

import {
	featureFlagContext,
	requireFeatureFlag,
} from './middleware/featureFlag.middleware';
import featureFlagService from './utils/featureFlag';
import Logger from './utils/logger';

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace Express {
		export interface Request {
			featureFlags?: {
				isEnabled: (flagName: string) => boolean;
			};
			user?: { id: string };
		}
	}
}

const app = express();
const port = 4001;
const logger = Logger.getLogger('FeatureFlagTest');

app.use(featureFlagContext);

logger.info('Available feature flags:');
const allFlags = featureFlagService.getAllFlags();
Object.keys(allFlags).forEach((flagName) => {
	const flag = allFlags[flagName];
	logger.info(
		`- ${flagName}: ${flag?.description} (${flag?.enabled ? 'enabled' : 'disabled'}, type: ${flag?.type})`
	);
});

app.get('/welcome', requireFeatureFlag('new-user-welcome'), (_, res) => {
	res.send('Welcome to the application!');
});

app.get('/search', (req, res) => {
	if (req.featureFlags?.isEnabled('enhanced-search')) {
		res.send('Enhanced search results');
	} else {
		res.send('Basic search results');
	}
});

app.get('/beta/:userId', (req, res) => {
	req['user'] = { id: req.params.userId };

	if (req.featureFlags?.isEnabled('beta-features')) {
		res.send(`Beta features enabled for user ${req.params.userId}`);
	} else {
		res.send(`Beta features not available for user ${req.params.userId}`);
	}
});

app.get('/experimental', requireFeatureFlag('experimental-ui'), (_req, res) => {
	res.send('Experimental UI enabled');
});

app.listen(port, () => {
	logger.info(`Feature flag test server running at http://localhost:${port}`);
	logger.info('Available routes:');
	logger.info('- GET /welcome - Protected by new-user-welcome feature flag');
	logger.info(
		'- GET /search - Uses enhanced-search feature flag in controller'
	);
	logger.info(
		'- GET /beta/:userId - Tests user targeting with beta-features flag'
	);
	logger.info(
		'- GET /experimental - Protected by disabled experimental-ui flag'
	);
});
