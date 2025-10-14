import { isBoolean, isString, isNumber } from '@orkestrel/validator'
import type { SyncOptions, LlmsOptions, OrkEslintOptions, GenerateApiOptions } from './types.js'

function isRecord(x: unknown): x is Record<string, unknown> {
	return typeof x === 'object' && x !== null && !Array.isArray(x)
}

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
	if (!isRecord(x)) return false
	if (!Array.isArray(x.include) || !x.include.every(isString)) return false
	if (!Array.isArray(x.exclude) || !x.exclude.every(isString)) return false
	if (!isBoolean(x.clean)) return false
	if (!isBoolean(x.hard)) return false
	if (!isBoolean(x.generateLlms)) return false
	if (!isBoolean(x.dryRun)) return false
	if (x.llms && !isRecord(x.llms)) return false
	return !(x.typedoc && !isRecord(x.typedoc));

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
	if (!isRecord(x)) return false
	if (!isString(x.pkgDir)) return false
	if (!isString(x.outDir)) return false
	if (x.hard !== undefined && !isBoolean(x.hard)) return false
	if (x.concurrency !== undefined && !isNumber(x.concurrency)) return false
	return !(x.timeoutMs !== undefined && !isNumber(x.timeoutMs));

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
	if (!isRecord(x)) return false
	if (x.stylisticIndent !== undefined && !(x.stylisticIndent === 'tab' || x.stylisticIndent === 2 || x.stylisticIndent === 4)) return false
	return !(x.allowTypesFile !== undefined && !isString(x.allowTypesFile));

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
	if (!isRecord(x)) return false
	if (!isString(x.pkgDir)) return false
	if (!isString(x.outDir)) return false
	if (x.baseConfigPath !== undefined && !isString(x.baseConfigPath)) return false
	if (x.tsconfig !== undefined && !isString(x.tsconfig)) return false
	if (x.entryPoints !== undefined && (!Array.isArray(x.entryPoints) || !x.entryPoints.every(isString))) return false
	if (x.entryPointStrategy !== undefined && !['resolve', 'expand', 'packages'].includes(String(x.entryPointStrategy))) return false
	return !(x.dryRun !== undefined && !isBoolean(x.dryRun));

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
	if (!isSyncOptions(x)) throw new TypeError('Invalid SyncOptions')
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
	if (!isLlmsOptions(x)) throw new TypeError('Invalid LlmsOptions')
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
	if (!isGenerateApiOptions(x)) throw new TypeError('Invalid GenerateApiOptions')
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
	if (!isOrkEslintOptions(x)) throw new TypeError('Invalid OrkEslintOptions')
}
