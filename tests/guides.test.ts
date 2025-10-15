import { describe, test, expect } from 'vitest'
import path from 'node:path'
import { copyGuides } from '@orkestrel/docs'
import { withDocsSandbox, captureConsole, createPackage } from './setup'

describe('copyGuides', () => {
	test('copies guides directory content', async () => {
		await withDocsSandbox('guides-copy', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'guides-copy-pkg')
			await sandbox.ensureFile(path.join(pkgDir, 'guides', 'index.md'), '# Guides\nContent\n')
			const targetOut = path.join(sandbox.root, 'guides-out')
			await copyGuides({ pkgDir, guidesRel: 'guides', outDir: targetOut })
			const copied = await sandbox.readFile(path.join(targetOut, 'index.md'))
			expect(copied).toMatch(/Content/)
		})
	})

	test('dry-run logs action without copying', async () => {
		await withDocsSandbox('guides-dry', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'guides-dry-pkg')
			await sandbox.ensureFile(path.join(pkgDir, 'guides', 'index.md'), '# DRY\n')
			const targetOut = path.join(sandbox.root, 'guides-out')
			const { log } = await captureConsole(() => copyGuides({ pkgDir, guidesRel: 'guides', outDir: targetOut, dryRun: true }), 'real')
			expect(log).toMatch(/dry-run/i)
			const exists = await sandbox.exists(path.join(targetOut, 'index.md'))
			expect(exists).toBe(false)
		})
	})

	test('skips when guides folder missing', async () => {
		await withDocsSandbox('guides-missing', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'guides-missing-pkg')
			const { log } = await captureConsole(() => copyGuides({ pkgDir, guidesRel: 'guides', outDir: path.join(sandbox.root, 'guides-out') }), 'real')
			expect(log).toMatch(/No guides/)
		})
	})

	test('empty guides folder copies and produces empty outDir', async () => {
		await withDocsSandbox('guides-empty', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'guides-empty-pkg')
			await sandbox.ensureDir(path.join(pkgDir, 'guides')) // create empty guides
			const targetOut = path.join(sandbox.root, 'guides-out')
			await copyGuides({ pkgDir, guidesRel: 'guides', outDir: targetOut })
			const entries = await sandbox.readDir(path.join(sandbox.root, 'guides-out'))
			expect(entries.length).toBe(0)
		})
	})

	test('overwrites existing destination content', async () => {
		await withDocsSandbox('guides-overwrite', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'guides-overwrite-pkg')
			await sandbox.ensureFile(path.join(pkgDir, 'guides', 'new.md'), 'NEW\n')
			const targetOut = path.join(sandbox.root, 'guides-out')
			await sandbox.ensureDir(targetOut)
			await sandbox.ensureFile(path.join(targetOut, 'old.md'), 'OLD\n')
			await copyGuides({ pkgDir, guidesRel: 'guides', outDir: targetOut })
			const files = await sandbox.readDir(path.join(sandbox.root, 'guides-out'))
			expect(files).toContain('new.md')
		})
	})
})
