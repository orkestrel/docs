import { describe, test, expect } from 'vitest'
import path from 'node:path'
import { generateLlmsOutputs } from '@orkestrel/docs'
import { withDocsSandbox, captureConsole, createPackage } from './setup'

describe('generateLlmsOutputs', () => {
	test('programmatic generation writes llms.txt and llms-full.txt', async () => {
		await withDocsSandbox('llms-basic', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-basic-pkg')
			const guidesDir = path.join(pkgDir, 'guides')
			await sandbox.ensureDir(guidesDir)
			await sandbox.ensureFile(path.join(guidesDir, 'index.md'), '# Home\n\nWelcome.\n')
			const outDir = path.join(sandbox.root, 'out-basic')
			await generateLlmsOutputs({ pkgDir, outDir, hard: false })
			const llm = await sandbox.readFile(path.join(outDir, 'llms.txt'), 'utf8')
			const full = await sandbox.readFile(path.join(outDir, 'llms-full.txt'), 'utf8')
			expect(llm.length).toBeGreaterThan(0)
			expect(full.length).toBeGreaterThan(0)
		})
	})

	test('progress callback fires during hard run link validation', async () => {
		await withDocsSandbox('llms-hard', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-hard-pkg')
			const guidesDir = path.join(pkgDir, 'guides')
			await sandbox.ensureDir(guidesDir)
			await sandbox.ensureFile(path.join(guidesDir, 'index.md'), '# Home\n\nSee [example](https://example.com).\n')
			const outDir = path.join(sandbox.root, 'out-hard')
			const progressEvents: Array<{ validated: number, total: number, broken: number }> = []
			await generateLlmsOutputs({ pkgDir, outDir, hard: true, onValidateProgress: e => progressEvents.push(e) })
			expect(progressEvents.length).toBeGreaterThan(0)
			const last = progressEvents[progressEvents.length - 1]
			expect(last.validated).toBe(last.total)
		})
	})

	test('hard run forces validateLinks even if validateLinks false (dry-run logging)', async () => {
		await withDocsSandbox('llms-hard-override', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-hard-override-pkg')
			const guidesDir = path.join(pkgDir, 'guides')
			await sandbox.ensureDir(guidesDir)
			await sandbox.ensureFile(path.join(guidesDir, 'index.md'), '# X\n')
			const outDir = path.join(sandbox.root, 'out-hard-override')
			const { log } = await captureConsole(() => generateLlmsOutputs({ pkgDir, outDir, hard: true, dryRun: true, validateLinks: false, concurrency: 2, timeoutMs: 100 }), 'real')
			expect(log).toMatch(/validateLinks/)
		})
	})

	test('dry-run without hard does not create output files', async () => {
		await withDocsSandbox('llms-dry', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-dry-pkg')
			const guidesDir = path.join(pkgDir, 'guides')
			await sandbox.ensureDir(guidesDir)
			await sandbox.ensureFile(path.join(guidesDir, 'index.md'), '# Y\n')
			const outDir = path.join(sandbox.root, 'out-dry')
			const { log } = await captureConsole(() => generateLlmsOutputs({ pkgDir, outDir, hard: false, dryRun: true, concurrency: 2, timeoutMs: 100 }), 'real')
			expect(log).toMatch(/dry-run/i)
			const existsLlms = await sandbox.exists(path.join(outDir, 'llms.txt'))
			expect(existsLlms).toBe(false)
		})
	})

	test('dry-run hard run logs validateLinks and no files created', async () => {
		await withDocsSandbox('llms-hard-dry-run', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-hard-dry-run-pkg')
			const guidesDir = path.join(pkgDir, 'guides')
			await sandbox.ensureDir(guidesDir)
			await sandbox.ensureFile(path.join(guidesDir, 'index.md'), '# Y\n')
			const outDir = path.join(sandbox.root, 'out-hard-dry')
			const { log } = await captureConsole(() => generateLlmsOutputs({ pkgDir, outDir, hard: true, dryRun: true }), 'real')
			expect(log).toMatch(/validateLinks/)
			const existsLlms = await sandbox.exists(path.join(outDir, 'llms.txt'))
			expect(existsLlms).toBe(false)
		})
	})

	test('generation leaves existing root outputs intact', async () => {
		await withDocsSandbox('llms-root-present', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-root-present-pkg')
			const guidesDir = path.join(pkgDir, 'guides')
			await sandbox.ensureDir(guidesDir)
			await sandbox.ensureFile(path.join(guidesDir, 'index.md'), '# Root\n')
			const outDir = path.join(sandbox.root, 'out-root')
			await sandbox.ensureFile(path.join(outDir, 'llms.txt'), 'PRE\n')
			await sandbox.ensureFile(path.join(outDir, 'llms-full.txt'), 'PREFULL\n')
			await generateLlmsOutputs({ pkgDir, outDir, hard: false })
			const llm = await sandbox.readFile(path.join(outDir, 'llms.txt'), 'utf8')
			const full = await sandbox.readFile(path.join(outDir, 'llms-full.txt'), 'utf8')
			expect(llm.length).toBeGreaterThan(0)
			expect(full.length).toBeGreaterThan(0)
		})
	})

	test('skips llms outputs when guides missing (no files created)', async () => {
		await withDocsSandbox('llms-no-guides', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-no-guides-pkg')
			const outDir = path.join(sandbox.root, 'out-no-guides')
			const { log } = await captureConsole(() => generateLlmsOutputs({ pkgDir, outDir, hard: false }), 'real')
			expect(log).toMatch(/Skipping LLMs generation|skip LLMs/i)
			const existsLlms = await sandbox.exists(path.join(outDir, 'llms.txt'))
			expect(existsLlms).toBe(false)
		})
	})

	test('dry-run skips llms generation when guides missing logs skip message', async () => {
		await withDocsSandbox('llms-no-guides-dry', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'llms-no-guides-dry-pkg')
			const outDir = path.join(sandbox.root, 'out-no-guides-dry')
			const { log } = await captureConsole(() => generateLlmsOutputs({ pkgDir, outDir, hard: false, dryRun: true }), 'real')
			expect(log).toMatch(/skip LLMs/i)
			const existsLlms = await sandbox.exists(path.join(outDir, 'llms.txt'))
			expect(existsLlms).toBe(false)
		})
	})
})
