import type { ValidateProgress, GenerateConfig } from '@orkestrel/llms-txt'
import type { Application } from 'typedoc'
import type { createConfigForNuxt } from '@nuxt/eslint-config/flat'

/**
 * Orkestrel ESLint flat config options (builds on Nuxt's createConfigForNuxt options).
 */
export interface OrkEslintOptions {
	readonly stylisticIndent?: 'tab' | 2 | 4
	readonly allowTypesFile?: string // default "src/types.ts"
	/** Pass-through options forwarded to Nuxt's createConfigForNuxt (merged). */
	readonly nuxt?: Readonly<Parameters<typeof createConfigForNuxt>[0]>
	/** Extra TypeScript rules merged into orkestrel baseline. */
	readonly extendRules?: Readonly<Record<string, unknown>>
	/** Extra jsdoc plugin rules merged into configured jsdoc rules. */
	readonly extendJsdocRules?: Readonly<Record<string, unknown>>
	/** Extra tsdoc plugin rules merged into configured tsdoc rules. */
	readonly extendTsdocRules?: Readonly<Record<string, unknown>>
	/** Additional flat config entries appended to the final array. */
	readonly additionalConfigs?: readonly unknown[]
}

/**
 * Options to copy guides.
 */
export interface CopyGuidesOptions {
	readonly pkgDir: string
	readonly guidesRel: string // e.g., "guides"
	readonly outDir: string // docs/packages/<pkg>/guides
	readonly dryRun?: boolean
}

/**
 * Cache entry for a single package.
 */
export interface CacheEntry {
	readonly guidesHash: string
	readonly apiHash: string
	readonly updatedAt?: string
}

/**
 * Cache file structure stored at docs/packages/cache.json.
 */
export interface CacheFile {
	readonly version: 1
	readonly packages: Record<string, CacheEntry>
}

/**
 * Options for generating LLM text outputs (extends \@orkestrel/llms-txt GenerateConfig sans docsDir).
 */
export interface LlmsOptions extends Omit<GenerateConfig, 'docsDir'> {
	readonly pkgDir: string
	/** When true, forces link validation (overrides validateLinks). */
	readonly hard?: boolean
	readonly onValidateProgress?: (e: ValidateProgress) => void // optional external progress hook
	readonly dryRun?: boolean // wrapper-only; not passed to llms-txt
}

/**
 * Options for a docs synchronization run.
 */
export interface SyncOptions {
	readonly include: readonly string[]
	readonly exclude: readonly string[]
	readonly clean: boolean
	readonly hard: boolean // enable link validation
	readonly generateLlms: boolean // default true; can be disabled
	readonly dryRun: boolean
	/** Pass-through LLMs config (hard overrides validateLinks). */
	readonly llms?: Readonly<Omit<GenerateConfig, 'docsDir' | 'outDir'> & { onValidateProgress?: (e: ValidateProgress) => void }>
	/** Optional TypeDoc pass-through overrides. */
	readonly typedoc?: Readonly<{
		readonly entryPoints?: readonly string[]
		readonly entryPointStrategy?: 'resolve' | 'expand' | 'packages'
		readonly tsconfig?: string
		readonly extraApplicationOptions?: Readonly<Partial<Parameters<typeof Application.bootstrap>[0]>>
		/** When true, attempt to auto-install dependencies if package.json declares deps but node_modules is missing. */
		readonly autoInstallDeps?: boolean
		/** Preferred package manager when auto-installing (auto-detected by lockfile when omitted). */
		readonly packageManager?: 'npm' | 'pnpm' | 'yarn'
	}>
}

/**
 * Options for API doc generation (builds on TypeDoc Application.bootstrap options).
 */
export interface GenerateApiOptions {
	readonly pkgDir: string
	readonly outDir: string
	readonly baseConfigPath?: string
	readonly tsconfig?: string
	readonly entryPoints?: readonly string[]
	readonly entryPointStrategy?: 'resolve' | 'expand' | 'packages'
	readonly dryRun?: boolean
	/** Additional TypeDoc bootstrap options merged last (override defaults). */
	readonly extraApplicationOptions?: Readonly<Partial<Parameters<typeof Application.bootstrap>[0]>>
	/** See SyncOptions.typedoc.autoInstallDeps */
	readonly autoInstallDeps?: boolean
	/** See SyncOptions.typedoc.packageManager */
	readonly packageManager?: 'npm' | 'pnpm' | 'yarn'
}
