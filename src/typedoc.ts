import path from 'node:path'
import { Application } from 'typedoc'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import type { GenerateApiOptions } from './types.js'

function hasDeclaredDeps(pkgDir: string): boolean {
	try {
		const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>, devDependencies?: Record<string, string> }
		const deps = Object.keys(pkg.dependencies ?? {})
		const dev = Object.keys(pkg.devDependencies ?? {})
		return deps.length + dev.length > 0
	}
	catch { return false }
}

function detectPackageManager(pkgDir: string, pref?: 'npm' | 'pnpm' | 'yarn'): 'npm' | 'pnpm' | 'yarn' {
	if (pref) return pref
	if (fs.existsSync(path.join(pkgDir, 'pnpm-lock.yaml'))) return 'pnpm'
	if (fs.existsSync(path.join(pkgDir, 'yarn.lock'))) return 'yarn'
	return 'npm'
}

async function installDependencies(pkgDir: string, pm: 'npm' | 'pnpm' | 'yarn', dryRun: boolean): Promise<void> {
	const hasNpmLock = fs.existsSync(path.join(pkgDir, 'package-lock.json'))
	const args = pm === 'npm' ? (hasNpmLock ? ['ci'] : ['install']) : ['install']
	if (dryRun) {
		console.log(`[dry-run] install dependencies in ${pkgDir} -> ${pm} ${args.join(' ')}`)
		return
	}
	await new Promise<void>((resolve, reject) => {
		const child = spawn(pm, args, { cwd: pkgDir, stdio: 'inherit', shell: process.platform === 'win32' })
		child.on('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`${pm} ${args.join(' ')} exited with code ${code}`))
		})
		child.on('error', reject)
	})
}

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
		extraApplicationOptions = {},
		autoInstallDeps = true,
		packageManager,
	} = opts

	// Preflight: package.json must exist
	if (!fs.existsSync(path.join(pkgDir, 'package.json'))) {
		throw new Error(`Missing package.json in ${pkgDir}`)
	}

	if (dryRun) {
		const relBase = baseConfigPath ? path.relative(process.cwd(), baseConfigPath) : '(defaults)'
		const relEntries = entryPoints.length ? ` entryPoints=${entryPoints.map(e => path.relative(pkgDir, e)).join(',')}` : ''

		console.log(`[dry-run] TypeDoc for ${pkgDir} -> ${outDir} (base: ${relBase})${relEntries} strategy=${entryPointStrategy}`)
		// Still surface potential missing deps intent in dry-run
		const needsDeps = hasDeclaredDeps(pkgDir) && !fs.existsSync(path.join(pkgDir, 'node_modules'))
		if (needsDeps) {
			const pm = detectPackageManager(pkgDir, packageManager)
			if (autoInstallDeps) console.log(`[dry-run] install dependencies in ${pkgDir} -> ${pm} ${(pm === 'npm' && fs.existsSync(path.join(pkgDir, 'package-lock.json'))) ? 'ci' : 'install'}`)
			else console.log(`[dry-run] missing dependencies in ${pkgDir} (node_modules not found)`)
		}
		return
	}

	// If package declares deps but node_modules missing -> install or throw.
	const needsDeps = hasDeclaredDeps(pkgDir) && !fs.existsSync(path.join(pkgDir, 'node_modules'))
	if (needsDeps) {
		if (!autoInstallDeps) {
			throw new Error(`Dependencies not installed for ${pkgDir}. Install via your package manager (e.g., npm ci) or enable autoInstallDeps.`)
		}
		const pm = detectPackageManager(pkgDir, packageManager)
		await installDependencies(pkgDir, pm, false)
	}

	// Validate entry point file existence (only in non-dry-run). Empty list allowed.
	if (entryPoints.length) {
		const missing = entryPoints.filter(p => !fs.existsSync(p))
		if (missing.length) throw new Error(`Missing entry points: ${missing.join(', ')}`)
	}

	// Normalize entry point paths to POSIX for TypeDoc (avoids backslash glob issues on Windows)
	const entryPointsPosix = entryPoints.length ? entryPoints.map(p => p.split(path.sep).join('/')) : []

	const bootstrapOpts: Parameters<typeof Application.bootstrapWithPlugins>[0] = {
		...(baseConfigPath ? { options: baseConfigPath as unknown as string } : {}),
		tsconfig,
		entryPoints: entryPointsPosix.length ? [...entryPointsPosix] : undefined,
		entryPointStrategy,
		// Ensure markdown plugin is loaded even without a local typedoc.base.json
		plugin: ['typedoc-plugin-markdown', 'typedoc-plugin-frontmatter', 'typedoc-plugin-extras'],
		...extraApplicationOptions,
	}

	// Bootstrap WITH plugins so typedoc-plugin-markdown is loaded.
	const app = await Application.bootstrapWithPlugins(bootstrapOpts)

	// Disable HTML output explicitly and configure markdown output dir.
	app.options.setValue('html', false)
	app.options.setValue('markdown', outDir)

	// Convert and emit with cwd set to the package directory so relative paths resolve as expected.
	const origCwd = process.cwd()
	process.chdir(pkgDir)
	try {
		const project = await app.convert()
		if (!project) throw new Error(`TypeDoc conversion failed for ${pkgDir}`)
		await app.generateOutputs(project)
	}
	finally {
		process.chdir(origCwd)
	}

	console.log(`Generated API docs: ${outDir}`)
}
