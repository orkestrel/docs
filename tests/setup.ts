import { afterAll, beforeAll } from 'vitest'
import { promises as fs } from 'node:fs'
import * as fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Root under OS temp for all test artifacts
export const testRoot = path.join(os.tmpdir(), `orkdocs-tests-${process.pid}`)
let counter = 0

function allocateTestDir(label: string): string {
	counter++
	return path.join(testRoot, `${String(counter).padStart(2, '0')}-${label}`)
}

let origLog: typeof console.log
let origInfo: typeof console.info
let origWarn: typeof console.warn
let origError: typeof console.error
const suppressed = (..._args: unknown[]) => { /* suppressed */ }

let cleanupInstalled = false
let cleaned = false

// Prepare a clean test root; called at suite start.
async function ensureFreshTestRoot(): Promise<void> {
	await fs.rm(testRoot, { recursive: true, force: true })
	await fs.mkdir(testRoot, { recursive: true })
}

// Synchronous teardown for test root; safe to call multiple times.
function cleanupTempRootSync(): void {
	if (cleaned) return
	cleaned = true
	try {
		fsSync.rmSync(testRoot, { recursive: true, force: true })
	}
	catch { /* ignore */ }
}

// Register process-level teardown hooks (exit, signals, fatal errors). Setup stays in beforeAll.
function installProcessCleanupHooks(): void {
	if (cleanupInstalled) return
	cleanupInstalled = true
	process.once('beforeExit', cleanupTempRootSync)
	process.once('exit', cleanupTempRootSync)
	for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK', 'SIGHUP'] as const) {
		try {
			process.once(sig, () => {
				cleanupTempRootSync()
			})
		}
		catch { /* signal not supported */ }
	}
	try {
		process.once('uncaughtException', (err: unknown) => {
			try {
				cleanupTempRootSync()
			}
			finally {
				setImmediate(() => {
					throw (err instanceof Error ? err : new Error(String(err)))
				})
			}
		})
	}
	catch { /* ignore */ }
	try {
		process.once('unhandledRejection', (reason: unknown) => {
			try {
				cleanupTempRootSync()
			}
			finally {
				setImmediate(() => {
					throw (reason instanceof Error ? reason : new Error(String(reason)))
				})
			}
		})
	}
	catch { /* ignore */ }
}

beforeAll(async () => {
	origLog = console.log
	origInfo = console.info
	origWarn = console.warn
	origError = console.error
	installProcessCleanupHooks()
	await ensureFreshTestRoot()
	console.log = suppressed
	console.info = suppressed
	console.warn = suppressed
	console.error = suppressed
})

afterAll(async () => {
	console.log = origLog
	console.info = origInfo
	console.warn = origWarn
	console.error = origError
	cleanupTempRootSync()
})

// Write a file ensuring its parent directory exists (UTF-8).
async function writeFileEnsured(p: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(p), { recursive: true })
	await fs.writeFile(p, content, 'utf8')
}

// Resolve to an absolute path under root; throw if it escapes (op names the caller for clarity).
function toAbsWithin(root: string, relOrAbsPath: string, op: string): string {
	const abs = path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.join(root, relOrAbsPath)
	const rel = path.relative(root, abs)
	if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) return abs
	throw new Error(`Sandbox ${op}: path escapes sandbox root`)
}

/**
 * Capture console output while running a callback.
 *
 * When mode is 'real', logs from console methods are collected and returned.
 * When mode is 'suppress', console output is silenced during execution.
 *
 * @typeParam T - Value returned by the callback
 * @param fn - Callback to execute
 * @param mode - 'real' to collect logs or 'suppress' to silence them (default: 'real')
 * @returns A promise resolving to the callback result and captured log text
 * @example
 * ```ts
 * const { value, log } = await captureConsole(async () => {
 *   console.log('hello'); return 42
 * }, 'real')
 * value // 42
 * log.includes('hello') // true
 * ```
 */
export async function captureConsole<T>(fn: () => Promise<T> | T, mode: 'real' | 'suppress' = 'real'): Promise<{ value: T, log: string }> {
	let logBuff = ''
	const collect = (...args: unknown[]) => {
		logBuff += args.map(String).join(' ') + '\n'
	}
	if (mode === 'real') {
		console.log = collect
		console.info = collect
		console.warn = collect
		console.error = collect
	}
	else {
		console.log = suppressed
		console.info = suppressed
		console.warn = suppressed
		console.error = suppressed
	}
	try {
		const value = await fn()
		return { value, log: logBuff }
	}
	finally {
		console.log = suppressed
		console.info = suppressed
		console.warn = suppressed
		console.error = suppressed
	}
}

/** Filesystem helpers and guards available inside a test sandbox. */
export interface DocsSandbox {
	readonly root: string
	ensureDir(relOrAbsPath: string): Promise<string>
	ensureFile(relOrAbsPath: string, content: string): Promise<string>
	exists(relOrAbsPath: string): Promise<boolean>
	readFile(relOrAbsPath: string, encoding?: BufferEncoding): Promise<string>
	readDir(relOrAbsPath: string): Promise<readonly string[]>
	remove(relOrAbsPath: string, opts?: { readonly recursive?: boolean, readonly force?: boolean }): Promise<void>
	stat(relOrAbsPath: string): Promise<import('node:fs').Stats | null>
}

// Best-effort node_modules linkage to speed up resolution inside the sandbox.
async function symlinkNodeModules(targetRoot: string): Promise<void> {
	try {
		const repoNodeModules = path.join(process.cwd(), 'node_modules')
		await fs.stat(repoNodeModules)
		const linkTarget = path.join(targetRoot, 'node_modules')
		try {
			await fs.rm(linkTarget, { recursive: true, force: true })
		}
		catch {
			/* ignore */
		}
		await fs.symlink(repoNodeModules, linkTarget, process.platform === 'win32' ? 'junction' : 'dir')
	}
	catch {
		/* ignore */
	}
}

/**
 * Run a callback with the current working directory temporarily switched.
 *
 * @typeParam T - Return type of the callback
 * @param cwd - Directory to use as temporary CWD
 * @param fn - Function to execute while CWD is set
 * @returns The callback value
 * @example
 * ```ts
 * await withCwd('/tmp/work', async () => {
 *   // ... do work under /tmp/work
 * })
 * ```
 */
export async function withCwd<T>(cwd: string, fn: () => Promise<T> | T): Promise<T> {
	const orig = process.cwd()
	process.chdir(cwd)
	try {
		return await fn()
	}
	finally {
		process.chdir(orig)
	}
}

/**
 * Execute a callback inside an isolated, package-agnostic sandbox directory.
 *
 * The current working directory is switched to the sandbox root for the duration
 * of the callback and restored afterwards.
 *
 * @param label - Identifier used to name the sandbox directory
 * @param fn - Function executed with the sandbox helpers
 * @returns The value returned by the callback
 * @example
 * ```ts
 * await withDocsSandbox('example', async (sb) => {
 *   await sb.ensureFile('readme.md', '# Hello')
 *   const exists = await sb.exists('readme.md') // true
 * })
 * ```
 */
export async function withDocsSandbox<T>(label: string, fn: (sandbox: DocsSandbox) => Promise<T> | T): Promise<T> {
	const root = allocateTestDir(label)
	await fs.mkdir(root, { recursive: true })
	await symlinkNodeModules(root)

	const sandbox: DocsSandbox = {
		root,
		async ensureDir(relOrAbsPath: string) {
			const abs = toAbsWithin(root, relOrAbsPath, 'ensureDir')
			await fs.mkdir(abs, { recursive: true })
			return abs
		},
		async ensureFile(relOrAbsPath: string, content: string) {
			const abs = toAbsWithin(root, relOrAbsPath, 'ensureFile')
			await writeFileEnsured(abs, content)
			return abs
		},
		async exists(relOrAbsPath: string) {
			try {
				const abs = toAbsWithin(root, relOrAbsPath, 'exists')
				await fs.access(abs)
				return true
			}
			catch { return false }
		},
		async readFile(relOrAbsPath: string, encoding: BufferEncoding = 'utf8') {
			const abs = toAbsWithin(root, relOrAbsPath, 'readFile')
			return fs.readFile(abs, encoding).then(String)
		},
		async readDir(relOrAbsPath: string) {
			const abs = toAbsWithin(root, relOrAbsPath, 'readDir')
			return fs.readdir(abs)
		},
		async remove(relOrAbsPath: string, opts: { readonly recursive?: boolean, readonly force?: boolean } = {}) {
			const abs = toAbsWithin(root, relOrAbsPath, 'remove')
			await fs.rm(abs, { recursive: opts.recursive ?? false, force: opts.force ?? false })
		},
		async stat(relOrAbsPath: string) {
			try {
				const abs = toAbsWithin(root, relOrAbsPath, 'stat')
				return await fs.stat(abs)
			}
			catch { return null }
		},
	}

	return withCwd(root, () => fn(sandbox))
}

/**
 * Create an orkestrel/docs workspace inside the sandbox for tools that expect
 * to run from `orkestrel/docs` (e.g., runSync). Returns absolute paths.
 *
 * @param sandbox - Target sandbox
 * @returns Absolute paths to the created orkRoot and docsDir
 * @example
 * ```ts
 * const ws = await ensureOrkestrelDocsWorkspace(sb)
 * // ws.orkRoot/... siblings can be packages; ws.docsDir is the CWD for runner
 * ```
 */
export async function ensureOrkestrelDocsWorkspace(sandbox: DocsSandbox): Promise<{ readonly orkRoot: string, readonly docsDir: string }> {
	const orkRoot = path.join(sandbox.root, 'orkestrel')
	const docsDir = path.join(orkRoot, 'docs')
	await fs.mkdir(docsDir, { recursive: true })
	return { orkRoot, docsDir }
}

/** Options for creating a minimal base package. */
export interface CreatePackageOptions {
	/** Fields to merge into package.json (shallow). */
	readonly packageJson?: Readonly<Record<string, unknown>>
	/** Content for src/index.ts (default: 'export const val = 1\\n'). */
	readonly srcContent?: string
	/** README.md content (default: '# <name>\\n'). */
	readonly readme?: string
	/**
	 * Extra files or directories to create under the package root.
	 * - For directories: end the key with '/' or set value to null/undefined
	 * - For files: provide a string value (empty string creates an empty file)
	 */
	readonly extraFiles?: Readonly<Record<string, string | null | undefined>>
}

/**
 * Create a minimal package: package.json, src/index.ts, and README.md.
 *
 * @param sandbox - Target sandbox
 * @param name - Package directory name
 * @param parentDir - Optional absolute parent directory; defaults to sandbox.root
 * @param opts - Optional files and metadata to override/extend
 * @returns Absolute path to the created package directory
 * @example
 * ```ts
 * // Minimal
 * const dir = await createPackage(sb, 'pkg-a')
 * // With overrides
 * await createPackage(sb, 'pkg-b', undefined, {
 *   packageJson: { license: 'MIT' },
 *   srcContent: 'export const x = 1\\n',
 *   readme: '# Hello\\n',
 *   extraFiles: { 'guides/': null, 'src/extra.ts': 'export{}' },
 * })
 * ```
 */
export async function createPackage(
	sandbox: DocsSandbox,
	name: string,
	parentDir?: string,
	opts: CreatePackageOptions = {},
): Promise<string> {
	const base = parentDir ?? sandbox.root
	const pkgDir = path.join(base, name)
	await fs.rm(pkgDir, { recursive: true, force: true })
	const srcDir = path.join(pkgDir, 'src')
	await fs.mkdir(srcDir, { recursive: true })
	const pkgJson: Record<string, unknown> = { name, ...(opts.packageJson ?? {}) }
	await writeFileEnsured(path.join(pkgDir, 'package.json'), JSON.stringify(pkgJson, null, 2))
	await writeFileEnsured(path.join(srcDir, 'index.ts'), opts.srcContent ?? 'export const val = 1\n')
	await writeFileEnsured(path.join(pkgDir, 'README.md'), opts.readme ?? `# ${name}\n`)
	if (opts.extraFiles) {
		for (const [rel, content] of Object.entries(opts.extraFiles)) {
			const isDir = rel.endsWith('/') || content === null || content === undefined
			const target = path.join(pkgDir, rel.replace(/[\\/]+$/, ''))
			if (isDir) {
				await fs.mkdir(target, { recursive: true })
			}
			else {
				await writeFileEnsured(target, content)
			}
		}
	}
	return pkgDir
}

/** Options for creating a minimal Node package. */
export interface CreateNodePackageOptions {
	readonly packageName?: string
	readonly type?: 'module' | 'commonjs'
	/** Additional fields to merge into package.json (shallow). */
	readonly packageJson?: Readonly<Record<string, unknown>>
	/** Optional README.md content at the package root. */
	readonly readme?: string
	/** Source files to create/override after base creation (relative -\> content). */
	readonly srcFiles?: Readonly<Record<string, string>>
	/** Extra files or directories to create under the package root. */
	readonly extraFiles?: Readonly<Record<string, string | null | undefined>>
}

/**
 * Create a minimal Node package (ESM by default) with optional injections.
 *
 * @param sandbox - Target sandbox
 * @param name - Package directory name
 * @param opts - Optional configuration for Node-specific bits
 * @param parentDir - Optional absolute directory under which to create the package (default: sandbox.root)
 * @returns Absolute path to the created package directory
 * @example
 * ```ts
 * const pkg = await createNodePackage(sandbox, 'minimal', { packageName: 'minimal', readme: '# Minimal\n' })
 * ```
 */
export async function createNodePackage(
	sandbox: DocsSandbox,
	name: string,
	opts: CreateNodePackageOptions = {},
	parentDir?: string,
): Promise<string> {
	const pkgName = opts.packageName ?? name
	const pkgJson: Record<string, unknown> = {
		name: pkgName,
		type: opts.type ?? 'module',
		...(opts.packageJson ?? {}),
	}
	const mergedExtra: Record<string, string | null | undefined> = { ...(opts.extraFiles ?? {}) }
	if (opts.srcFiles) {
		for (const [rel, content] of Object.entries(opts.srcFiles)) mergedExtra[rel] = content
	}
	return await createPackage(sandbox, name, parentDir, {
		packageJson: pkgJson,
		readme: opts.readme,
		extraFiles: Object.keys(mergedExtra).length ? mergedExtra : undefined,
	})
}

/** Options for creating a minimal Orkestrel package in tests. */
export interface CreateOrkestrelPackageOptions extends CreateNodePackageOptions {
	/** Include a guides folder with files (default: true with index.md). */
	readonly includeGuides?: boolean
	/** Files to write under guides/ (relative to the guides folder). */
	readonly guidesFiles?: Readonly<Record<string, string>>
}

/**
 * Create a minimal Orkestrel-oriented package with optional guides and extras.
 *
 * Builds on createNodePackage and can inject a guides/ folder with an index.md,
 * along with any extra files typical of Orkestrel packages.
 *
 * @param sandbox - Target sandbox
 * @param name - Package directory name
 * @param opts - Optional configuration
 * @param parentDir - Optional absolute directory to place the package under (default: sandbox.root)
 * @returns Absolute path to the created package directory
 * @example
 * ```ts
 * const pkgDir = await createOrkestrelPackage(sandbox, 'ork-pkg', {
 *   packageName: '@scope/ork-pkg',
 *   includeGuides: true,
 *   guidesFiles: { 'index.md': '# Guides\n' },
 * })
 * ```
 */
export async function createOrkestrelPackage(
	sandbox: DocsSandbox,
	name: string,
	opts: CreateOrkestrelPackageOptions = {},
	parentDir?: string,
): Promise<string> {
	const pkgDir = await createNodePackage(sandbox, name, opts, parentDir)
	if (opts.includeGuides !== false) {
		const guidesDir = path.join(pkgDir, 'guides')
		await fs.mkdir(guidesDir, { recursive: true })
		const files = opts.guidesFiles ?? { 'index.md': '# Guides\n' }
		await Promise.all(Object.entries(files).map(([rel, content]) => writeFileEnsured(path.join(guidesDir, rel), content)))
	}
	return pkgDir
}
