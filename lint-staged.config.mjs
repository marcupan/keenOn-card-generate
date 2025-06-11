export default {
	'*.js': (files) => {
		// Filter out problematic files temporarily
		const filteredFiles = files.filter(
			(file) => !file.includes('scripts/generate-dependency-graph.js')
		);
		return filteredFiles.length > 0
			? `eslint --fix ${filteredFiles.join(' ')}`
			: [];
	},
	'*.ts': 'eslint --fix',
	'*.{json,md}': 'prettier --write',
};
