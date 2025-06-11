#!/usr/bin/env node

/**
 * Dependency Graph Generator
 *
 * This script generates a visual dependency graph for the project.
 * It uses madge to analyze dependencies and creates a graph in SVG format.
 *
 * Usage:
 *   node scripts/generate-dependency-graph.js
 *
 * Requirements:
 *   - madge: npm install -g madge
 *   - graphviz: must be installed on the system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const outputDir = path.join(__dirname, '../docs/dependencies');
const srcDir = path.join(__dirname, '../src');
const outputFile = path.join(outputDir, 'dependency-graph.svg');
const packageJsonPath = path.join(__dirname, '../package.json');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// Generate dependency graph for source code
console.log('Generating source code dependency graph...');
try {
	execSync(
		`madge --image ${outputFile} --extensions ts --exclude "node_modules|dist|test" ${srcDir}`,
		{
			stdio: 'inherit',
		}
	);
	console.log(`Source code dependency graph generated at: ${outputFile}`);
} catch (error) {
	console.error(
		'Error generating source code dependency graph:',
		error.message
	);
	console.log('Make sure madge and graphviz are installed:');
	console.log('  npm install -g madge');
	console.log('  Install graphviz: https://graphviz.org/download/');
}

// Generate npm dependency report
console.log('\nGenerating npm dependency report...');
const npmReportPath = path.join(outputDir, 'npm-dependencies.md');

try {
	// Read package.json
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

	// Get dependencies and devDependencies
	const dependencies = packageJson.dependencies || {};
	const devDependencies = packageJson.devDependencies || {};

	// Create markdown report
	let report = '# NPM Dependencies\n\n';

	// Add production dependencies
	report += '## Production Dependencies\n\n';
	report += '| Package | Version | Description |\n';
	report += '|---------|---------|-------------|\n';

	for (const [name, version] of Object.entries(dependencies)) {
		report += `| ${name} | ${version} | |\n`;
	}

	// Add development dependencies
	report += '\n## Development Dependencies\n\n';
	report += '| Package | Version | Description |\n';
	report += '|---------|---------|-------------|\n';

	for (const [name, version] of Object.entries(devDependencies)) {
		report += `| ${name} | ${version} | |\n`;
	}

	// Add a third-party service dependencies section
	report += '\n## Third-Party Service Dependencies\n\n';
	report +=
		'These are external services that our application depends on:\n\n';
	report += '| Service | Purpose | Fallback Strategy |\n';
	report += '|---------|---------|-------------------|\n';
	report +=
		'| PostgreSQL | Primary database | Connection pooling with retry logic |\n';
	report +=
		'| Redis | Caching and session storage | Local memory cache fallback |\n';
	report +=
		'| gRPC Translation Service | Translation services | Return untranslated content with warning |\n';

	// Write a report to file
	fs.writeFileSync(npmReportPath, report);
	console.log(`NPM dependency report generated at: ${npmReportPath}`);

	// Make the script executable
	fs.chmodSync(__filename, '755');

	console.log('\nDependency graph generation complete!');
	console.log(
		'To view the dependency graph, open the SVG file in a browser.'
	);
	console.log(
		'To update package descriptions in the npm report, edit the markdown file manually.'
	);
} catch (error) {
	console.error('Error generating npm dependency report:', error.message);
}
