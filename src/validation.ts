import {
	isBoolean,
	isString,
	isNumber,
	isRecord,
	arrayOf,
	objectOf,
	hasPartialSchema,
	literalOf,
	unionOf,
	assertWithGuard,
} from '@orkestrel/validator'
import type { SyncOptions, LlmsOptions, OrkEslintOptions, GenerateApiOptions } from './types.js'

/**
 * Shallow runtime validation for a potential `SyncOptions` value.
 *
 * Validates primitive field shapes and array element types; nested pass-through objects
 * (`llms`, `typedoc`) are only checked to be records when present.
 *
 * @param x - Unknown input to validate
 * @returns True when `x` conforms to the `SyncOptions` contract
 * @example
 * ```ts
 * if (isSyncOptions(maybe)) {
 *   // narrowed to SyncOptions here
 * }
 * ```
 */
export function isSyncOptions(x: unknown): x is SyncOptions {
	const guard = objectOf({
		include: arrayOf(isString),
		exclude: arrayOf(isString),
		clean: isBoolean,
		hard: isBoolean,
		generateLlms: isBoolean,
		dryRun: isBoolean,
		llms: isRecord,
		typedoc: isRecord,
	}, { optional: ['llms', 'typedoc'] as const })
	return guard(x)
}

/**
 * Shallow validation for `LlmsOptions` (wrapper around generation config).
 *
 * Ensures required string fields and basic numeric constraints when present.
 *
 * @param x - Unknown input to validate
 * @returns True when `x` matches `LlmsOptions`
 * @example
 * ```ts
 * assertLlmsOptions(opts)
 * ```
 */
export function isLlmsOptions(x: unknown): x is LlmsOptions {
	const guard = objectOf({
		pkgDir: isString,
		outDir: isString,
		hard: isBoolean,
		concurrency: isNumber,
		timeoutMs: isNumber,
	}, { optional: ['hard', 'concurrency', 'timeoutMs'] as const })
	return guard(x)
}

/**
 * Shallow validation for `OrkEslintOptions` (all fields optional).
 *
 * @param x - Unknown input to validate
 * @returns True when `x` is a valid partial `OrkEslintOptions`
 * @example
 * ```ts
 * if (isOrkEslintOptions(cfg)) {
 *   // safe to pass into createOrkestrelConfig
 * }
 * ```
 */
export function isOrkEslintOptions(x: unknown): x is OrkEslintOptions {
	const stylisticIndent = unionOf(literalOf('tab'), literalOf(2, 4))
	return hasPartialSchema(x, {
		stylisticIndent,
		allowTypesFile: isString,
	})
}

/**
 * Shallow validation for `GenerateApiOptions` used by the TypeDoc wrapper.
 *
 * @param x - Unknown input to validate
 * @returns True when conforming to `GenerateApiOptions`
 * @example
 * ```ts
 * if (!isGenerateApiOptions(apiOpts)) throw new Error('bad options')
 * ```
 */
export function isGenerateApiOptions(x: unknown): x is GenerateApiOptions {
	const entryPointStrategy = literalOf('resolve', 'expand', 'packages')
	const guard = objectOf({
		pkgDir: isString,
		outDir: isString,
		baseConfigPath: isString,
		tsconfig: isString,
		entryPoints: arrayOf(isString),
		entryPointStrategy,
		dryRun: isBoolean,
	}, { optional: ['baseConfigPath', 'tsconfig', 'entryPoints', 'entryPointStrategy', 'dryRun'] as const })
	return guard(x)
}

/**
 * Assert helper for `SyncOptions`.
 *
 * @param x - Unknown input expected to be `SyncOptions`
 * @throws TypeError when invalid
 * @example
 * ```ts
 * assertSyncOptions(config)
 * ```
 */
export function assertSyncOptions(x: unknown): asserts x is SyncOptions {
	assertWithGuard(x, isSyncOptions)
}

/**
 * Assert helper for `LlmsOptions`.
 *
 * @param x - Unknown input expected to be `LlmsOptions`
 * @throws TypeError when invalid
 * @example
 * ```ts
 * assertLlmsOptions(cfg)
 * ```
 */
export function assertLlmsOptions(x: unknown): asserts x is LlmsOptions {
	assertWithGuard(x, isLlmsOptions)
}

/**
 * Assert helper for `GenerateApiOptions`.
 *
 * @param x - Unknown input expected to be `GenerateApiOptions`
 * @throws TypeError when invalid
 * @example
 * ```ts
 * assertGenerateApiOptions(apiCfg)
 * ```
 */
export function assertGenerateApiOptions(x: unknown): asserts x is GenerateApiOptions {
	assertWithGuard(x, isGenerateApiOptions)
}

/**
 * Assert helper for `OrkEslintOptions`.
 *
 * @param x - Unknown input expected to be `OrkEslintOptions`
 * @throws TypeError when invalid
 * @example
 * ```ts
 * assertOrkEslintOptions(eslintCfg)
 * ```
 */
export function assertOrkEslintOptions(x: unknown): asserts x is OrkEslintOptions {
	assertWithGuard(x, isOrkEslintOptions)
}
