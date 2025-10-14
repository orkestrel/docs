import path from 'node:path'
import { normalizeLlmsOutputs, fileExists } from './helpers.js'
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
	const { pkgDir, hard, dryRun, ...passThrough } = opts
	const { outDir } = passThrough
	const guidesDir = path.join(pkgDir, 'guides')

	if (!(await fileExists(guidesDir))) {
		if (dryRun) {
			console.log(`[dry-run] skip LLMs (no guides at ${guidesDir})`)
			return
		}
		console.log(`Skipping LLMs generation (no guides directory at ${guidesDir}).`)
		return
	}

	if (dryRun) {
		const parts: string[] = [
			`[dry-run] @orkestrel/llms-txt root=${pkgDir}`,
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
		docsDir: guidesDir,
		validateLinks: hard ? true : passThrough.validateLinks,
	})

	await normalizeLlmsOutputs(outDir, ['llms.txt', 'llms-full.txt'])
	console.log(`Generated LLMs text outputs in ${outDir}`)
}
