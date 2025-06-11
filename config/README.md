# Configuration Management

This directory contains configuration files for the keenOn-card-generate service. The service uses the [node-config](https://github.com/node-config/node-config) package to manage configuration across different environments.

## Configuration Files

- `default.js` - Default configuration values that apply to all environments
- `development.js` - Configuration values specific to the development environment
- `production.js` - Configuration values specific to the production environment
- `test.js` - Configuration values specific to the test environment
- `custom-environment-variables.js` - Maps environment variables to configuration settings

## Environment Selection

The configuration system automatically selects the appropriate configuration file based on the `NODE_ENV` environment variable:

```bash
# For development
NODE_ENV=development npm start

# For production
NODE_ENV=production npm start

# For testing
NODE_ENV=test npm test
```

If `NODE_ENV` is not set, the system defaults to using the `development` configuration.

## Configuration Hierarchy

Configuration values are loaded in the following order, with later values overriding earlier ones:

1. `default.js` (base configuration)
2. `{NODE_ENV}.js` (environment-specific configuration)
3. Environment variables (as mapped in `custom-environment-variables.js`)
4. Command line arguments

## Using Configuration in Code

To use configuration values in your code:

```typescript
import config from 'config';

// Get a simple value
const port = config.get<number>('port');

// Get a nested value
const redisHost = config.get<string>('redisConfig.host');

// Get a complex object
const featureFlags = config.get<FeatureFlagConfig>('featureFlags');
```

## Adding New Configuration Values

When adding new configuration values:

1. Add the default value to `default.js`
2. Add environment-specific overrides to the appropriate environment files
3. If the value should be configurable via environment variables, add a mapping to `custom-environment-variables.js`
4. Update the type definitions if necessary

## Feature Flags

Feature flags are configured in the `featureFlags` section of the configuration. Each feature flag has:

- `name` - The name of the feature flag
- `description` - A description of what the feature flag controls
- `enabled` - Whether the feature flag is enabled
- `type` - The type of feature flag (boolean, percentage, userTargeting)
- Additional properties depending on the type (e.g., `percentage`, `targetedUserIds`)

Feature flags can be controlled via environment variables using the format `FEATURE_FLAG_[FLAG_NAME]`.
