import path from 'node:path'
import { Application } from 'typedoc'
import type { GenerateApiOptions } from './types'

/**
 * Generate TypeDoc API documentation for a package using the central base config.
 *
 * @param opts - API generation options, including entry points and strategy
 * @returns A promise that resolves once docs are generated
 * @example
 * ```ts
 * await generateApiDocs({
 *   pkgDir: '/path/to/pkg',
 *   outDir: '/path/to/out',
 *   baseConfigPath: '/path/to/typedoc.base.json'
 * })
 * ```
 */
export async function generateApiDocs(opts: GenerateApiOptions): Promise<void> {
	const {
		pkgDir,
		outDir,
		baseConfigPath,
		tsconfig,
		entryPoints = [],
		entryPointStrategy = 'resolve',
		dryRun,
	} = opts

	if (dryRun) {
		const relBase = baseConfigPath ? path.relative(process.cwd(), baseConfigPath) : '(defaults)'
		const relEntries = entryPoints.length ? ` entryPoints=${entryPoints.map(e => path.relative(pkgDir, e)).join(',')}` : ''

		console.log(`[dry-run] TypeDoc for ${pkgDir} -> ${outDir} (base: ${relBase})${relEntries} strategy=${entryPointStrategy}`)
		return
	}

	const app = await Application.bootstrap({
		// The TypeDoc options type is broad; we pass only known keys.
		// Casting to unknown avoids relying on TypeDoc's internal types.

		options: baseConfigPath as unknown as string,
		tsconfig,
		entryPoints: entryPoints.length ? [...entryPoints] : undefined,
		entryPointStrategy,
	})

	const project = await app.convert()
	if (!project) throw new Error(`TypeDoc conversion failed for ${pkgDir}`)

	await app.generateDocs(project, outDir)

	console.log(`Generated API docs: ${outDir}`)
}
