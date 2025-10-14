import path from 'node:path'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import crypto from 'node:crypto'
import type { CacheFile } from './types.js'

/**
 * Check whether a path exists.
 *
 * @param p - Absolute or relative path to check
 * @returns True when the path exists
 * @example
 * ```ts
 * const exists = await fileExists('/path/to/file')
 * ```
 */
export async function fileExists(p: string): Promise<boolean> {
	try {
		await fsp.access(p, fs.constants.F_OK)
		return true
	}
	catch {
		return false
	}
}

/**
 * Read a package.json and return its minimal metadata.
 *
 * @param pkgDir - Absolute path to a package directory
 * @returns Parsed package metadata or null if missing/invalid
 * @example
 * ```ts
 * const meta = await getPackageMeta('/path/to/pkg')
 * console.log(meta?.name)
 * ```
 */
export async function getPackageMeta(pkgDir: string): Promise<Readonly<{ name?: string }> | null> {
	const pkgJson = path.join(pkgDir, 'package.json')
	if (!(await fileExists(pkgJson))) {
		return null
	}
	try {
		return JSON.parse(await fsp.readFile(pkgJson, 'utf8')) as Readonly<{ name?: string }>
	}
	catch {
		return null
	}
}

/**
 * Convert a possibly scoped name to its base segment, e.g. "\@scope/core" -\> "core".
 *
 * @param name - Package name (scoped or unscoped)
 * @returns Base name without scope
 * @example
 * ```ts
 * toBaseName('@orkestrel/core') // => 'core'
 * toBaseName('validator') // => 'validator'
 * ```
 */
export function toBaseName(name: string): string {
	const parts = name.split('/')
	return parts[parts.length - 1] ?? name
}

/**
 * Determine if a package matches include/exclude filters.
 *
 * @param baseName - The package base name (e.g., "core")
 * @param dir - Absolute path to the package directory
 * @param patterns - Patterns provided on CLI
 * @param defaultWhenEmpty - Default decision when no patterns provided
 * @returns True if matched
 * @example
 * ```ts
 * matchesFilter('core', '/path/to/core', ['core'], true) // => true
 * ```
 */
export function matchesFilter(
	baseName: string,
	dir: string,
	patterns: readonly string[],
	defaultWhenEmpty: boolean,
): boolean {
	if (!patterns?.length) return defaultWhenEmpty
	const dirName = path.basename(dir)
	const nameVariants = new Set([baseName, dirName])
	return patterns.some(p => nameVariants.has(p) || dir.includes(p))
}

/**
 * Recursively walk a directory and collect file paths.
 *
 * @param absDir - Absolute directory to walk
 * @param files - Accumulator (for internal recursion)
 * @returns Array of absolute file paths
 * @example
 * ```ts
 * const files = await walkDir('/path/to/dir')
 * console.log(files.length)
 * ```
 */
export async function walkDir(absDir: string, files: string[] = []): Promise<string[]> {
	const entries = await fsp.readdir(absDir, { withFileTypes: true })
	for (const e of entries) {
		const abs = path.join(absDir, e.name)
		if (e.isDirectory()) files = await walkDir(abs, files)
		else if (e.isFile()) files.push(abs)
	}
	return files
}

/**
 * Hash a single file by path and content.
 *
 * @param absPath - Absolute file path
 * @param hash - Crypto hash instance
 */
async function hashFile(absPath: string, hash: crypto.Hash): Promise<void> {
	const data = await fsp.readFile(absPath)
	hash.update(absPath)
	hash.update(data)
}

/**
 * Filter out files that should not influence API hashing.
 *
 * @param absPath - Absolute file path
 * @returns True if the file should be skipped
 */
function shouldSkipForApi(absPath: string): boolean {
	const rel = absPath.toLowerCase()
	if (rel.includes(`${path.sep}node_modules${path.sep}`)) return true
	if (rel.includes(`${path.sep}dist${path.sep}`)) return true
	if (rel.includes(`${path.sep}build${path.sep}`)) return true
	return rel.endsWith('.test.ts') || rel.endsWith('.spec.ts');

}

/**
 * Compute a deterministic hash over all guides files.
 *
 * @param pkgDir - Absolute path to a package directory
 * @returns Hex digest representing the guides content
 * @example
 * ```ts
 * const hash = await computeGuidesHash('/path/to/pkg')
 * ```
 */
export async function computeGuidesHash(pkgDir: string): Promise<string> {
	const guidesDir = path.join(pkgDir, 'guides')
	const hash = crypto.createHash('sha256')
	if (!fs.existsSync(guidesDir)) {
		hash.update('no-guides')
		return hash.digest('hex')
	}
	const files = (await walkDir(guidesDir)).sort()
	for (const f of files) await hashFile(f, hash)
	return hash.digest('hex')
}

/**
 * Compute a deterministic hash over API sources and the central TypeDoc base config.
 *
 * @param pkgDir - Absolute path to a package directory
 * @param typedocBasePath - Absolute path to typedoc.base.json
 * @returns Hex digest representing the API inputs
 * @example
 * ```ts
 * const hash = await computeApiHash('/path/to/pkg', '/path/to/typedoc.base.json')
 * ```
 */
export async function computeApiHash(pkgDir: string, typedocBasePath: string): Promise<string> {
	const srcDir = path.join(pkgDir, 'src')
	const h = crypto.createHash('sha256')
	if (!fs.existsSync(srcDir)) {
		h.update('no-src')
	}
	else {
		const files = (await walkDir(srcDir)).filter(f => !shouldSkipForApi(f)).sort()
		for (const f of files) await hashFile(f, h)
	}
	if (fs.existsSync(typedocBasePath)) await hashFile(typedocBasePath, h)
	else h.update('no-typedoc-base')
	return h.digest('hex')
}

/**
 * Load a cache file if it exists; otherwise return an empty cache.
 *
 * @param cachePath - Absolute path to cache.json
 * @returns Parsed cache
 * @example
 * ```ts
 * const cache = await loadCache('/path/to/cache.json')
 * ```
 */
export async function loadCache(cachePath: string): Promise<CacheFile> {
	try {
		const json = JSON.parse(await fsp.readFile(cachePath, 'utf8')) as CacheFile
		if (!json.version || !json.packages) throw new Error('Invalid cache file')
		return json
	}
	catch {
		return { version: 1, packages: {} }
	}
}

/**
 * Persist a cache file to disk.
 *
 * @param cachePath - Absolute path to cache.json
 * @param cache - Cache data to save
 * @returns A promise that resolves when the file is written
 * @example
 * ```ts
 * await saveCache('/path/to/cache.json', cache)
 * ```
 */
export async function saveCache(cachePath: string, cache: CacheFile): Promise<void> {
	await fsp.writeFile(cachePath, JSON.stringify(cache, null, 2), 'utf8')
}

/**
 * Ensure LLM outputs exist at outDir root; move them from subfolders if needed.
 *
 * @param outDir - Target directory (docs/packages/<pkg>)
 * @param files - Expected filenames to normalize (defaults to llms files)
 * @returns A promise that resolves once normalization is complete
 * @example
 * ```ts
 * await normalizeLlmsOutputs('/path/to/out', ['llms.txt', 'llms-full.txt'])
 * ```
 */
export async function normalizeLlmsOutputs(
	outDir: string,
	files: readonly string[] = ['llms.txt', 'llms-full.txt'],
): Promise<void> {
	await fsp.mkdir(outDir, { recursive: true })
	for (const name of files) {
		const rootTarget = path.join(outDir, name)
		if (await fileExists(rootTarget)) continue

		// Search recursively for the file
		let foundPath: string | null = null
		try {
			foundPath = (await walkDir(outDir)).find(p => path.basename(p) === name) ?? null
		}
		catch {
			// ignore traversal errors
		}

		if (!foundPath) {
			// Missing output is not fatal; the generator may have been configured differently
			// Consumers can decide to enforce presence via link validation (hard mode) in CI.
			continue
		}

		// Move to root; fallback to copy+unlink if rename fails
		try {
			await fsp.rename(foundPath, rootTarget)
		}
		catch {
			try {
				await fsp.copyFile(foundPath, rootTarget)
				await fsp.unlink(foundPath)
			}
			catch {
				// If both rename and copy fail, leave as-is to avoid data loss.
			}
		}
	}
}
