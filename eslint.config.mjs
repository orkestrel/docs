import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import jsdoc from 'eslint-plugin-jsdoc'
import tsdoc from 'eslint-plugin-tsdoc'

// Generate Nuxt + TypeScript base config
const base = await createConfigForNuxt({
	features: { stylistic: { indent: 'tab' } },
})

// Project TypeScript rule hardening
const orkTs = {
	name: 'orkestrel/typescript',
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
		'@typescript-eslint/no-explicit-any': 'error',
		'@typescript-eslint/no-non-null-assertion': 'error',
		'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
	},
}

// Common AST selectors for exported declarations
const exportedFns = [
	'ExportNamedDeclaration > FunctionDeclaration',
	'ExportDefaultDeclaration > FunctionDeclaration',
]
const exportedClasses = [
	'ExportNamedDeclaration > ClassDeclaration',
	'ExportDefaultDeclaration > ClassDeclaration',
]
const exportedMethods = [
	'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="method"][accessibility!=private][accessibility!=protected]',
	'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="method"][accessibility!=private][accessibility!=protected]',
]
const exportedGetters = [
	'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="get"][accessibility!=private][accessibility!=protected]',
	'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="get"][accessibility!=private][accessibility!=protected]',
]
const exportedSetters = [
	'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="set"][accessibility!=private][accessibility!=protected]',
	'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="set"][accessibility!=private][accessibility!=protected]',
]

// Project-specific TSDoc/JSDoc rules
const tsdocConfig = {
	name: 'orkestrel/tsdoc',
	plugins: { jsdoc, tsdoc },
	settings: {
		jsdoc: { mode: 'typescript', tagNamePreference: { returns: 'returns' } },
	},
	rules: {
		'tsdoc/syntax': 'error',
		'jsdoc/no-types': 'error',
		'jsdoc/require-jsdoc': ['error', {
			publicOnly: { ancestorsOnly: false, cjs: true, esm: true },
			contexts: [
				...exportedFns,
				...exportedClasses,
				...exportedMethods,
				...exportedGetters,
				...exportedSetters,
			],
			checkConstructors: false,
		}],
		'jsdoc/require-description': ['error', {
			contexts: [
				...exportedFns,
				...exportedClasses,
				...exportedMethods,
				...exportedGetters,
				...exportedSetters,
			],
		}],
		'jsdoc/require-param': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
		'jsdoc/require-param-description': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
		'jsdoc/require-returns': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
		'jsdoc/require-returns-description': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
		'jsdoc/require-example': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedClasses] }],
	},
}

// Restrict type/interface declarations to the canonical src/types.ts file
const restrictTypesOutsideTypes = {
	name: 'orkestrel/restrict-types-outside-types',
	files: ['src/**/*.ts', 'src/**/*.tsx'],
	rules: {
		'no-restricted-syntax': [
			'error',
			{ selector: 'TSTypeAliasDeclaration', message: 'Define type aliases only in src/types.ts.' },
			{ selector: 'TSInterfaceDeclaration', message: 'Define interfaces only in src/types.ts.' },
		],
	},
}

// Allow type/interface declarations within src/types.ts
const allowTypesInTypesFile = {
	name: 'orkestrel/allow-types-in-types',
	files: ['src/types.ts'],
	rules: {
		'no-restricted-syntax': 'off',
	},
}

export default [
	// Ignore generated artifacts
	{ name: 'orkestrel/ignores', ignores: ['guides/**', 'packages/**'] },
	...base,
	orkTs,
	...jsdoc.configs.examples,
	tsdocConfig,
	restrictTypesOutsideTypes,
	allowTypesInTypesFile,
]
