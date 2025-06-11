import path from 'node:path';
import { fileURLToPath } from 'node:url';

import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
	{
		ignores: ['dist/**', 'node_modules/**', '*.d.ts'],
	},

	// JavaScript files - completely avoid TypeScript parser
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: globals.node,
		},
		plugins: {
			prettier,
		},
		rules: {
			...js.configs.recommended.rules,
			'prettier/prettier': 'error',
			'no-console': 'off', // Allow console in JS files
		},
	},

	// TypeScript files - separate configuration
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
				project: './tsconfig.json',
				tsconfigRootDir: __dirname,
			},
			globals: globals.node,
		},
		plugins: {
			'@typescript-eslint': typescriptEslint,
			prettier,
		},
		rules: {
			...typescriptEslint.configs.recommended.rules,
			'prettier/prettier': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' },
			],
			'no-console': 'warn',
		},
	},
];
