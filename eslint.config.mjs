import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import _import from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import promise from 'eslint-plugin-promise';
import pluginSecurity from 'eslint-plugin-security';
import securityNode from 'eslint-plugin-security-node';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	pluginSecurity.configs.recommended,
	...compat.extends(
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:security-node/recommended',
		'prettier'
	),
	{
		plugins: {
			'@typescript-eslint': typescriptEslint,
			prettier,
			import: fixupPluginRules(_import),
			promise,
			eslintPluginPrettierRecommended,
			'security-node': securityNode,
		},

		languageOptions: {
			globals: {
				...globals.node,
				process: true,
			},

			parser: tsParser,
			ecmaVersion: 5,
			sourceType: 'commonjs',
		},

		settings: {
			'import/resolver': {
				node: {
					extensions: ['.js', '.jsx', '.ts'],
				},
			},
		},

		rules: {
			'prettier/prettier': [
				'error',
				{
					tabWidth: 4,
				},
				{
					usePrettierrc: true,
				},
			],

			indent: 'off',

			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
				},
			],

			'@typescript-eslint/explicit-module-boundary-types': 'off',

			'import/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: false,
					optionalDependencies: false,
					peerDependencies: false,
				},
			],

			'import/no-unresolved': 'error',

			'import/order': [
				'error',
				{
					groups: [
						'builtin',
						'external',
						'internal',
						'parent',
						'sibling',
						'index',
					],
					'newlines-between': 'always',

					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],

			'promise/always-return': 'error',
			'promise/catch-or-return': 'error',
			'promise/no-return-wrap': 'error',
			'promise/param-names': 'error',
			'promise/no-new-statics': 'error',

			'security-node/detect-crlf': 'off',

			...pluginSecurity.configs.recommended.rules,
		},
	},
	{
		files: ['**/*.ts'],

		rules: {
			'@typescript-eslint/no-var-requires': 'off',
		},
	},
];
