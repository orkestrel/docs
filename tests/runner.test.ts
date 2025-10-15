import { describe, test, expect } from 'vitest'
import path from 'node:path'
import { runSync } from '@orkestrel/docs'
import { captureConsole, withDocsSandbox, createPackage, ensureOrkestrelDocsWorkspace, withCwd } from './setup'

describe('runSync orchestrator', () => {
	test('dry-run propagates typedoc + llms overrides', async () => {
		await withDocsSandbox('runner-pass', async (sandbox) => {
			const ws = await ensureOrkestrelDocsWorkspace(sandbox)
			const pkgDir = await createPackage(sandbox, `runner-pass-${process.pid}`, ws.orkRoot)
			await sandbox.ensureFile(path.join(pkgDir, 'guides', 'index.md'), '# Hello\n')
			const { log } = await captureConsole(() => withCwd(ws.docsDir, () => runSync({
				include: ['runner-pass-' + process.pid],
				exclude: [],
				clean: false,
				hard: true,
				generateLlms: true,
				dryRun: true,
				typedoc: { entryPointStrategy: 'packages' },
				llms: { concurrency: 3, timeoutMs: 1234 },
			})), 'real')
			expect(log).toMatch(/strategy=packages/)
			expect(log).toMatch(/concurrency=3/)
			expect(log).toMatch(/timeoutMs=1234/)
			expect(log).toMatch(/validateLinks/)
		})
	})

	test('include filter with no matches logs no packages found', async () => {
		await withDocsSandbox('runner-none', async (sandbox) => {
			const ws = await ensureOrkestrelDocsWorkspace(sandbox)
			const { log } = await captureConsole(() => withCwd(ws.docsDir, () => runSync({ include: ['nonexistent'], exclude: [], clean: false, hard: false, generateLlms: true, dryRun: true })), 'real')
			expect(log).toMatch(/No packages found/i)
		})
	})

	test('exclude filter prevents processing of matching package', async () => {
		await withDocsSandbox('runner-exclude', async (sandbox) => {
			const ws = await ensureOrkestrelDocsWorkspace(sandbox)
			await createPackage(sandbox, `runner-exclude-${process.pid}`, ws.orkRoot)
			const { log } = await captureConsole(() => withCwd(ws.docsDir, () => runSync({ include: [], exclude: ['runner-exclude-' + process.pid], clean: false, hard: false, generateLlms: true, dryRun: true })), 'real')
			expect(log).not.toMatch(/runner-exclude-/)
		})
	})

	test('throws when executed from a directory whose parent is not orkestrel', async () => {
		// Use sandbox to allocate a docs directory whose parent is NOT named 'orkestrel'
		await withDocsSandbox('runner-bad-parent', async (sandbox) => {
			const nonOkDocs = await sandbox.ensureDir('not-ork-parent/docs')
			const orig = process.cwd()
			process.chdir(nonOkDocs)
			try {
				await expect(runSync({ include: [], exclude: [], clean: false, hard: false, generateLlms: true, dryRun: true })).rejects.toThrow(/parent folder named 'orkestrel'/i)
			}
			finally { process.chdir(orig) }
		})
	})

	test('unchanged package skipped after initial non-dry run', async () => {
		await withDocsSandbox('runner-unchanged', async (sandbox) => {
			const ws = await ensureOrkestrelDocsWorkspace(sandbox)
			const name = `runner-unchanged-${process.pid}`
			await createPackage(sandbox, name, ws.orkRoot)
			await withCwd(ws.docsDir, () => runSync({ include: [name], exclude: [], clean: false, hard: false, generateLlms: false, dryRun: false }))
			const { log } = await captureConsole(() => withCwd(ws.docsDir, () => runSync({ include: [name], exclude: [], clean: false, hard: false, generateLlms: false, dryRun: true })), 'real')
			expect(log).toMatch(/Unchanged:/)
		})
	})

	test('clean removes directories when changed (dry-run logs)', async () => {
		await withDocsSandbox('runner-clean', async (sandbox) => {
			const ws = await ensureOrkestrelDocsWorkspace(sandbox)
			const name = `runner-clean-${process.pid}`
			const pkgDir = await createPackage(sandbox, name, ws.orkRoot)
			await withCwd(ws.docsDir, () => runSync({ include: [name], exclude: [], clean: false, hard: false, generateLlms: false, dryRun: false }))
			await sandbox.ensureFile(path.join(pkgDir, 'guides', 'index.md'), '# Changed\n')
			const { log } = await captureConsole(() => withCwd(ws.docsDir, () => runSync({ include: [name], exclude: [], clean: true, hard: false, generateLlms: false, dryRun: true })), 'real')
			expect(log).toMatch(/clean .*guides/i)
		})
	})

	test('non-dry run generates markdown API docs (index.md)', async () => {
		await withDocsSandbox('runner-md', async (sandbox) => {
			const ws = await ensureOrkestrelDocsWorkspace(sandbox)
			await sandbox.ensureFile(path.join(ws.docsDir, 'typedoc.base.json'), JSON.stringify({
				plugin: ['typedoc-plugin-markdown', 'typedoc-plugin-frontmatter', 'typedoc-plugin-extras'],
				excludePrivate: true,
				excludeInternal: true,
			}, null, 2))
			const name = `runner-md-${process.pid}`
			await createPackage(sandbox, name, ws.orkRoot)
			const { log } = await captureConsole(() => withCwd(ws.docsDir, () => runSync({ include: [name], exclude: [], clean: false, hard: false, generateLlms: false, dryRun: false })), 'real')
			const apiDir = path.join(ws.docsDir, 'packages', name, 'api')
			const expectedMd = path.join(apiDir, 'index.md')
			const expectedHtml = path.join(apiDir, 'index.html')
			let stat = await sandbox.stat(expectedMd)
			let chosen = expectedMd
			if (!stat) {
				stat = await sandbox.stat(expectedHtml)
				if (stat) chosen = expectedHtml
			}
			if (!stat) {
				try {
					const entries = await sandbox.readDir(apiDir)
					const docs = entries.filter(e => e.endsWith('.md') || e.endsWith('.html'))
					expect(docs.length).toBeGreaterThan(0)
					chosen = path.join(apiDir, docs[0])
					const content = await sandbox.readFile(chosen)
					expect(content).toMatch(/val/)
					return
				}
				catch {
					throw new Error(`API docs not generated. Log output:\n${log}`)
				}
			}
			expect(stat).toBeTruthy()
			const content = await sandbox.readFile(chosen)
			expect(content).toMatch(/val/)
		})
	})

	test('dry-run logs planned dependency install when autoInstallDeps=true and package has deps', async () => {
		await withDocsSandbox('runner-auto-install-dry', async (sandbox) => {
			const ws = await ensureOrkestrelDocsWorkspace(sandbox)
			const name = `runner-auto-install-${process.pid}`
			const pkgDir = await createPackage(sandbox, name, ws.orkRoot)
			await sandbox.ensureFile(path.join(pkgDir, 'package.json'), JSON.stringify({ name: `@scope/${name}`, dependencies: { 'left-pad': '1.3.0' } }))
			const { log } = await captureConsole(() => withCwd(ws.docsDir, () => runSync({ include: [name], exclude: [], clean: false, hard: false, generateLlms: false, dryRun: true, typedoc: { autoInstallDeps: true } })), 'real')
			expect(log).toMatch(/install dependencies/i)
		})
	})
})
