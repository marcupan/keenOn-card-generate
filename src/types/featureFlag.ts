export enum FeatureFlagType {
	BOOLEAN = 'boolean',
	PERCENTAGE = 'percentage',
	USER_TARGETING = 'userTargeting',
}

export interface BaseFeatureFlag {
	name: string;
	description: string;
	enabled: boolean;
	type: FeatureFlagType;
}

export interface BooleanFeatureFlag extends BaseFeatureFlag {
	type: FeatureFlagType.BOOLEAN;
}

export interface PercentageFeatureFlag extends BaseFeatureFlag {
	type: FeatureFlagType.PERCENTAGE;
	percentage: number;
}

export interface UserTargetingFeatureFlag extends BaseFeatureFlag {
	type: FeatureFlagType.USER_TARGETING;
	targetedUserIds: string[];
}

export type FeatureFlag =
	| BooleanFeatureFlag
	| PercentageFeatureFlag
	| UserTargetingFeatureFlag;

export interface FeatureFlagConfig {
	flags: Record<string, FeatureFlag>;
}
