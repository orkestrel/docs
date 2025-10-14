import path from 'node:path'
import { normalizeLlmsOutputs } from './helpers'
import { generateAll } from '@orkestrel/llms-txt'
import type { LlmsOptions } from './types'

/**
 * Generate llms.txt and llms-full.txt for a package using the llms-txt package.
 *
 * @param opts - LLM generation options
 * @returns A promise that resolves once outputs are written and normalized
 * @example
 * ```ts
 * await generateLlmsOutputs({
 *   pkgDir: '/path/to/pkg',
 *   outDir: '/path/to/docs/packages/pkg',
 *   hard: false
 * })
 * ```
 */
export async function generateLlmsOutputs(opts: LlmsOptions): Promise<void> {
	const { pkgDir, outDir, dryRun, hard } = opts

	if (dryRun) {
		console.log(`[dry-run] run @orkestrel/llms-txt programmatically for root=${pkgDir} out=${outDir} ${hard ? '(validate links)' : ''}`)
		return
	}

	await generateAll({
		docsDir: path.join(pkgDir, 'guides'),
		outDir,
		validateLinks: hard,
	})

	await normalizeLlmsOutputs(outDir, ['llms.txt', 'llms-full.txt'])

	console.log(`Generated LLMs text outputs in ${outDir}`)
}
