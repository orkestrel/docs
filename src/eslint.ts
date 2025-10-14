import type { OrkEslintOptions } from './types.js'
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import jsdoc from 'eslint-plugin-jsdoc'
import tsdoc from 'eslint-plugin-tsdoc'

/**
 * Orkestrel ESLint flat config helper (Nuxt + TS + TSDoc/JSDoc + project rules).
 *
 * @example
 * ```ts
 * import { createOrkestrelConfig } from '\@orkestrel/docs/eslint'
 * export default await createOrkestrelConfig({ stylisticIndent: 'tab', allowTypesFile: 'src/types.ts' })
 * ```
 */

/**
 * Build a Flat config array composed from Nuxt's base config and project rules.
 *
 * @param opts - Optional configuration including stylistic indent and the allowed types file path
 * @returns Flat config array consumable by ESLint
 * @example
 * ```ts
 * const config = await createOrkestrelConfig({ stylisticIndent: 'tab' })
 * export default config
 * ```
 */
export async function createOrkestrelConfig(opts: OrkEslintOptions = {}): Promise<unknown[]> {
	const stylisticIndent = opts.stylisticIndent ?? 'tab'
	const typesFile = opts.allowTypesFile ?? 'src/types.ts'

	// Merge user Nuxt flat config options while enforcing stylistic indent override.
	const stylisticSource = (opts.nuxt?.features?.stylistic && typeof opts.nuxt.features.stylistic === 'object')
		? opts.nuxt.features.stylistic
		: {}
	const nuxtInput: Parameters<typeof createConfigForNuxt>[0] = {
		...(opts.nuxt ?? {}),
		features: {
			...(opts.nuxt?.features ?? {}),
			stylistic: {
				...stylisticSource,
				indent: stylisticIndent,
			},
		},
	} as const
	const base = await createConfigForNuxt(nuxtInput)

	const orkTs = {
		name: 'orkestrel/typescript',
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
			// User rule extensions
			...(opts.extendRules ?? {}),
		},
	}

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

	const jsdocExamples = (jsdoc as unknown as { configs?: { examples?: unknown[] } }).configs?.examples ?? []

	// Base jsdoc + tsdoc rules, extended by user-provided overrides.
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
				contexts: [...exportedFns, ...exportedClasses, ...exportedMethods, ...exportedGetters, ...exportedSetters],
				checkConstructors: false,
			}],
			'jsdoc/require-description': ['error', { contexts: [...exportedFns, ...exportedClasses, ...exportedMethods, ...exportedGetters, ...exportedSetters] }],
			'jsdoc/require-param': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
			'jsdoc/require-param-description': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
			'jsdoc/require-returns': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
			'jsdoc/require-returns-description': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
			'jsdoc/require-example': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedClasses] }],
			// User rule extensions
			...(opts.extendJsdocRules ?? {}),
			...(opts.extendTsdocRules ?? {}),
		},
	}

	const restrictTypesOutsideTypes = {
		name: 'orkestrel/restrict-types-outside-types',
		files: ['src/**/*.ts', 'src/**/*.tsx'],
		rules: {
			'no-restricted-syntax': [
				'error',
				{ selector: 'TSTypeAliasDeclaration', message: `Define type aliases only in ${typesFile}.` },
				{ selector: 'TSInterfaceDeclaration', message: `Define interfaces only in ${typesFile}.` },
			],
		},
	}

	const allowTypesInTypesFile = {
		name: 'orkestrel/allow-types-in-types',
		files: [typesFile],
		rules: { 'no-restricted-syntax': 'off' },
	}

	return [
		{ name: 'orkestrel/ignores', ignores: ['guides/**', 'packages/**/api/**'] },
		...base,
		orkTs,
		...jsdocExamples,
		tsdocConfig,
		restrictTypesOutsideTypes,
		allowTypesInTypesFile,
		...(opts.additionalConfigs ?? []),
	]
}

export default createOrkestrelConfig
