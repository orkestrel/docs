import path from 'node:path'
import fs from 'node:fs'
import { fileExists, normalizeLlmsOutputs, walkDir } from './helpers.js'
import { generateAll } from '@orkestrel/llms-txt'
import type { LlmsOptions } from './types.js'

/**
 * Generate llms.txt and llms-full.txt for a package using the llms-txt package.
 *
 * Derives `docsDir` from `pkgDir + /guides` and forwards all other options. The `hard` flag
 * forces link validation (`validateLinks: true`). Callers can supply `onValidateProgress`
 * to handle logging externally.
 *
 * @param opts - LLM generation options (extends GenerateConfig sans docsDir)
 * @returns A promise that resolves once outputs are written and normalized
 * @example
 * ```ts
 * await generateLlmsOutputs({
 *   pkgDir: '/path/to/pkg',
 *   outDir: '/path/to/docs/packages/pkg',
 *   hard: true,
 *   concurrency: 8,
 *   timeoutMs: 5000,
 *   onValidateProgress: e => console.log('links', e.validated, '/', e.total)
 * })
 * ```
 */
export async function generateLlmsOutputs(opts: LlmsOptions): Promise<void> {
	const { pkgDir, hard, dryRun, outDir, ...passThrough } = opts
	// Prefer using the per-package outDir as docs root when it already contains API markdown (or any .md files),
	// so that llms outputs aggregate both API and guides. Otherwise, fallback to the in-repo guides directory.
	let docsRoot = path.join(pkgDir, 'guides')
	const apiDir = path.join(outDir, 'api')
	if (fs.existsSync(apiDir)) {
		try {
			const files = await walkDir(apiDir)
			if (files.some(f => f.toLowerCase().endsWith('.md'))) {
				docsRoot = outDir
			}
		}
		catch {
			// Ignore traversal errors; fallback remains guidesDir
		}
	}

	if (!(await fileExists(docsRoot))) {
		if (dryRun) {
			console.log(`[dry-run] skip LLMs (no docs at ${docsRoot})`)
			return
		}
		console.log(`Skipping LLMs generation (no docs directory at ${docsRoot}).`)
		return
	}

	if (dryRun) {
		const parts: string[] = [
			`[dry-run] @orkestrel/llms-txt root=${docsRoot}`,
			`out=${outDir}`,
		]
		if (hard || passThrough.validateLinks) parts.push('validateLinks')
		if (passThrough.concurrency !== undefined) parts.push(`concurrency=${passThrough.concurrency}`)
		if (passThrough.timeoutMs !== undefined) parts.push(`timeoutMs=${passThrough.timeoutMs}`)
		console.log(parts.join(' '))
		return
	}

	await generateAll({
		...passThrough,
		docsDir: docsRoot,
		outDir,
		validateLinks: hard ? true : passThrough.validateLinks,
	})

	// Normalize outputs to the outDir root, honoring custom filenames when provided
	const outputNames = [
		passThrough.outputFileLlm ?? 'llms.txt',
		passThrough.outputFileFull ?? 'llms-full.txt',
	]
	await normalizeLlmsOutputs(outDir, outputNames)
	console.log(`Generated LLMs text outputs in ${outDir}`)
}
