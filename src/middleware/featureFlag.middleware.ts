import { AppError } from '@utils/appError';
import type { Request, Response, NextFunction } from 'express';

import { ErrorCode } from '../types/error';
import featureFlagService from '../utils/featureFlag';

/**
 * Middleware to check if a feature flag is enabled
 * @param flagName - Name of the feature flag to check
 * @returns Express middleware function
 */
export const requireFeatureFlag = (flagName: string) => {
	return (req: Request, _: Response, next: NextFunction): void => {
		const userId = req['user']?.id;

		const isEnabled = featureFlagService.isEnabled(
			flagName,
			userId ? { userId } : undefined
		);

		if (isEnabled) {
			return next();
		}

		return next(
			new AppError(
				ErrorCode.FEATURE_NOT_ENABLED,
				`Feature "${flagName}" is not enabled for this request`,
				403
			)
		);
	};
};

/**
 * Middleware to add feature flag context to the request
 * This allows controllers to check feature flags directly
 */
export const featureFlagContext = (
	req: Request,
	_: Response,
	next: NextFunction
): void => {
	req.featureFlags = {
		isEnabled: (flagName: string) => {
			const userId = req['user']?.id;
			return featureFlagService.isEnabled(
				flagName,
				userId ? { userId } : undefined
			);
		},
	};

	next();
};

export default { requireFeatureFlag, featureFlagContext };
