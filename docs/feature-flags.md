# Feature Flags

This document explains how to use the feature flag system for gradual rollout of new features.

## Overview

Feature flags (also known as feature toggles) allow you to enable or disable features in your application without deploying new code. This is useful for:

- Gradual rollout of new features
- A/B testing
- Canary releases
- Turning off problematic features quickly
- Allowing specific users to test beta features

## Configuration

Feature flags are configured in the `config/default.js` file under the `featureFlags` section. You can also override these settings in environment-specific configuration files.

### Example Configuration

```javascript
featureFlags: {
  flags: {
    // Simple boolean feature flag
    'new-user-welcome': {
      name: 'new-user-welcome',
      description: 'Show welcome message for new users',
      enabled: true,
      type: 'boolean'
    },

    // Percentage rollout feature flag
    'enhanced-search': {
      name: 'enhanced-search',
      description: 'Enable enhanced search functionality',
      enabled: true,
      type: 'percentage',
      percentage: 50 // Enable for 50% of requests
    },

    // User targeting feature flag
    'beta-features': {
      name: 'beta-features',
      description: 'Enable beta features for specific users',
      enabled: true,
      type: 'userTargeting',
      targetedUserIds: ['user1', 'user2', 'admin1'] // Enable only for these users
    }
  }
}
```

### Feature Flag Types

The system supports three types of feature flags:

1. **Boolean**: Simple on/off flags
2. **Percentage**: Enables the feature for a percentage of requests (useful for gradual rollouts)
3. **User Targeting**: Enables the feature only for specific user IDs

## Usage

### Middleware Approach

You can use the `requireFeatureFlag` middleware to protect routes with feature flags:

```typescript
import { requireFeatureFlag } from './middleware/featureFlag.middleware';

// Only allow access if the 'new-feature' flag is enabled
router.get('/new-feature', requireFeatureFlag('new-feature'), (req, res) => {
	res.send('New feature is enabled!');
});
```

### In Controllers

You can check feature flags directly in your controllers:

```typescript
router.get('/search', (req, res) => {
	if (req.featureFlags?.isEnabled('enhanced-search')) {
		// Use enhanced search
		return res.json(enhancedSearchResults);
	}

	// Fall back to basic search
	return res.json(basicSearchResults);
});
```

### User-Targeted Features

For user-targeted features, the user ID is automatically extracted from the authenticated user:

```typescript
router.get('/beta-features', (req, res) => {
	if (req.featureFlags?.isEnabled('beta-features')) {
		// This will only be true if the current user's ID is in the targetedUserIds list
		return res.json({ betaFeaturesEnabled: true });
	}

	return res.json({ betaFeaturesEnabled: false });
});
```

## Best Practices

1. **Use descriptive names**: Choose clear, descriptive names for your feature flags
2. **Add good descriptions**: Document what each flag controls
3. **Clean up old flags**: Remove feature flags once a feature is fully rolled out
4. **Default to off**: New features should default to disabled until ready for rollout
5. **Test both states**: Always test your application with the feature both enabled and disabled
6. **Avoid nesting**: Don't nest feature flags within other feature flags
7. **Keep it simple**: Don't use feature flags for complex conditional logic

## Testing

You can run the feature flag test script to see the feature flags in action:

```bash
npx ts-node src/test-feature-flags.ts
```

This will start a test server with several routes demonstrating different ways to use feature flags.
