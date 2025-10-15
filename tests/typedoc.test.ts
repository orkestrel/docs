import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { generateApiDocs } from '@orkestrel/docs'
import { captureConsole, createPackage, withDocsSandbox } from './setup'

describe('generateApiDocs', () => {
	test('dry-run passes through explicit entryPoints and strategy', async () => {
		await withDocsSandbox('typedoc-dry-explicit', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'dummy-pkg')
			const entry = path.join(pkgDir, 'src', 'index.ts')
			const { log } = await captureConsole(() => generateApiDocs({
				pkgDir,
				outDir: path.join(sandbox.root, 'dummy-out'),
				entryPoints: [entry],
				entryPointStrategy: 'packages',
				dryRun: true,
			}), 'real')
			expect(log).toMatch(/strategy=packages/)
			expect(log).toMatch(/entryPoints=.*index.ts/)
		})
	})

	test('dry-run with defaults logs resolve strategy', async () => {
		await withDocsSandbox('typedoc-dry-defaults', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'dummy-pkg2')
			const { log } = await captureConsole(() => generateApiDocs({
				pkgDir,
				outDir: path.join(sandbox.root, 'dummy-out2'),
				dryRun: true,
			}), 'real')
			expect(log).toMatch(/strategy=resolve/)
		})
	})

	test('throws when entryPoints reference missing files (non-dry-run)', async () => {
		await withDocsSandbox('typedoc-missing-entry', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'typedoc-bad')
			await sandbox.ensureDir('bad-out')
			await expect(generateApiDocs({
				pkgDir,
				outDir: path.join(sandbox.root, 'bad-out'),
				entryPoints: [path.join(pkgDir, 'src', 'missing.ts')],
				entryPointStrategy: 'resolve',
			})).rejects.toThrow(/Missing entry points/)
		})
	})

	test('real markdown generation with plugin config produces .md files', async () => {
		await withDocsSandbox('typedoc-md', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'typedoc-md-pkg')
			await sandbox.ensureFile(path.join(sandbox.root, 'typedoc.base.json'), JSON.stringify({
				plugin: ['typedoc-plugin-markdown', 'typedoc-plugin-frontmatter', 'typedoc-plugin-extras'],
				hideGenerator: true,
				excludePrivate: true,
				excludeInternal: true,
			}, null, 2))
			const outDir = path.join(sandbox.root, 'api-out')
			await generateApiDocs({ pkgDir, outDir, baseConfigPath: path.join(sandbox.root, 'typedoc.base.json'), entryPoints: [path.join(pkgDir, 'src', 'index.ts')], entryPointStrategy: 'resolve' })
			const entries = await sandbox.readDir(path.relative(sandbox.root, outDir))
			const hasDoc = entries.some(e => e.endsWith('.md') || e.endsWith('.html'))
			expect(hasDoc).toBe(true)
			let chosen: string | null
			if (entries.includes('index.md')) chosen = 'index.md'
			else if (entries.includes('index.html')) chosen = 'index.html'
			else {
				chosen = entries.find(e => e.endsWith('.md') || e.endsWith('.html')) ?? null
			}
			expect(chosen).not.toBeNull()
			if (chosen === null) throw new Error('No doc file generated')
			const indexContent = await sandbox.readFile(path.join(outDir, chosen))
			expect(indexContent).toMatch(/alpha|val/)
		})
	})

	test('throws when dependencies declared but node_modules missing and autoInstallDeps=false', async () => {
		await withDocsSandbox('typedoc-missing-deps', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'typedoc-missing-deps')
			await sandbox.ensureFile(path.join(pkgDir, 'package.json'), JSON.stringify({ name: '@scope/typedoc-missing-deps', dependencies: { 'left-pad': '1.3.0' } }))
			await expect(generateApiDocs({ pkgDir, outDir: path.join(sandbox.root, 'api-out'), autoInstallDeps: false })).rejects.toThrow(/Dependencies not installed/i)
		})
	})

	test('dry-run logs planned install when autoInstallDeps=true and node_modules missing', async () => {
		await withDocsSandbox('typedoc-auto-install-dry', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'typedoc-auto-install')
			await sandbox.ensureFile(path.join(pkgDir, 'package.json'), JSON.stringify({ name: '@scope/typedoc-auto-install', dependencies: { 'left-pad': '1.3.0' } }))
			const { log } = await captureConsole(() => generateApiDocs({ pkgDir, outDir: path.join(sandbox.root, 'api-out'), dryRun: true, autoInstallDeps: true }), 'real')
			expect(log).toMatch(/install dependencies/i)
		})
	})

	test('throws when package.json is missing', async () => {
		await withDocsSandbox('typedoc-no-pkgjson', async (sandbox) => {
			const pkgDir = path.join(sandbox.root, 'no-pkgjson')
			await sandbox.ensureDir(pkgDir)
			await expect(generateApiDocs({ pkgDir, outDir: path.join(sandbox.root, 'api-out'), autoInstallDeps: false })).rejects.toThrow(/Missing package.json/i)
		})
	})
})
