import config from 'config';

import type { FeatureFlag, FeatureFlagConfig } from '../types/featureFlag';
import { FeatureFlagType } from '../types/featureFlag';

import Logger from './logger';

class FeatureFlagService {
	private flags: Record<string, FeatureFlag> = {};
	private logger = Logger.getLogger('FeatureFlagService');

	constructor() {
		this.loadFlags();
	}

	/**
	 * Load feature flags from configuration
	 */
	private loadFlags(): void {
		try {
			const featureFlagConfig =
				config.get<FeatureFlagConfig>('featureFlags');
			this.flags = featureFlagConfig.flags;
			this.logger.info(
				`Loaded ${Object.keys(this.flags).length} feature flags`
			);
		} catch (error) {
			this.logger.warn(
				'Failed to load feature flags from config, using empty set',
				error
			);
			this.flags = {};
		}
	}

	/**
	 * Check if a feature flag is enabled
	 * @param flagName - Name of the feature flag
	 * @param context - Optional context for evaluating the flag (user ID, etc.)
	 * @returns boolean indicating if the feature is enabled
	 */
	isEnabled(flagName: string, context?: { userId?: string }): boolean {
		const flag = this.flags[flagName];

		if (!flag) {
			this.logger.warn(`Feature flag "${flagName}" not found`);
			return false;
		}

		if (!flag.enabled) {
			return false;
		}

		switch (flag.type) {
			case FeatureFlagType.BOOLEAN:
				return true;

			case FeatureFlagType.PERCENTAGE: {
				const randomPercentage = Math.random() * 100;
				return randomPercentage <= flag.percentage;
			}

			case FeatureFlagType.USER_TARGETING:
				if (!context?.userId) {
					return false;
				}
				return flag.targetedUserIds.includes(context.userId);

			default:
				this.logger.warn(`Unknown feature flag type for "${flagName}"`);
				return false;
		}
	}

	/**
	 * Get all feature flags
	 * @returns Record of all feature flags
	 */
	getAllFlags(): Record<string, FeatureFlag> {
		return { ...this.flags };
	}

	/**
	 * Reload feature flags from configuration
	 */
	reloadFlags(): void {
		this.loadFlags();
	}
}

const featureFlagService = new FeatureFlagService();

export default featureFlagService;
