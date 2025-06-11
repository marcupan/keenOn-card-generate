/**
 * API Version Management
 *
 * This module provides utilities for managing API versioning.
 * It follows Semantic Versioning (SemVer) principles:
 * - MAJOR version for incompatible API changes
 * - MINOR version for backward-compatible functionality additions
 * - PATCH version for backward-compatible bug fixes
 */

import fs from 'fs';
import path from 'path';

const packageJsonPath = path.join(__dirname, '../../package.json');

/**
 * Get the current API version from package.json
 * @returns {string} The current API version
 */
export function getApiVersion(): string {
	try {
		const packageJson = JSON.parse(
			fs.readFileSync(packageJsonPath, 'utf8')
		);

		return packageJson.version;
	} catch (error) {
		console.error('Error reading package.json:', error);
		return '0.0.0';
	}
}

/**
 * Get the major version number
 * @returns {number} The major version number
 */
export function getMajorVersion(): number {
	const version = getApiVersion();

	return parseInt(version.split('.')[0] ?? '0', 10);
}

/**
 * Check if the requested API version is supported
 * @param requestedVersion The version requested by the client
 * @returns {boolean} Whether the requested version is supported
 */
export function isVersionSupported(requestedVersion: string): boolean {
	const currentVersion = getApiVersion();
	const [currentMajor] = currentVersion.split('.').map(Number);
	const [requestedMajor] = requestedVersion.split('.').map(Number);

	return requestedMajor === currentMajor;
}

/**
 * Get the latest supported version for a given major version
 * @param majorVersion The major version to check
 * @returns {string} The latest supported version for the given major version
 */
export function getLatestSupportedVersion(majorVersion: number): string | null {
	const currentVersion = getApiVersion();
	const [currentMajor] = currentVersion.split('.').map(Number);

	if (majorVersion === currentMajor) {
		return currentVersion;
	}

	return null;
}

export default {
	getApiVersion,
	getMajorVersion,
	isVersionSupported,
	getLatestSupportedVersion,
};
