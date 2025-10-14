/**
 * Orkestrel ESLint flat config options.
 */
export interface OrkEslintOptions {
	readonly stylisticIndent?: 'tab' | 2 | 4
	readonly allowTypesFile?: string // default "src/types.ts"
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
 * Options for generating LLM text outputs.
 */
export interface LlmsOptions {
	readonly pkgDir: string
	readonly outDir: string // docs/packages/<pkg>
	readonly dryRun?: boolean
	readonly hard: boolean // when true, enable link validation
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
}

/**
 * Options for API doc generation.
 */
export interface GenerateApiOptions {
	readonly pkgDir: string
	readonly outDir: string
	readonly baseConfigPath?: string
	readonly tsconfig?: string
	readonly entryPoints?: readonly string[]
	readonly entryPointStrategy?: 'resolve' | 'expand' | 'packages'
	readonly dryRun?: boolean
}
