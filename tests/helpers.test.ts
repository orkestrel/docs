import { describe, test, expect } from 'vitest'
import path from 'node:path'
import {
	computeGuidesHash,
	computeApiHash,
	fileExists,
	walkDir,
	toBaseName,
	matchesFilter,
	loadCache,
	saveCache,
	normalizeLlmsOutputs,
	getPackageMeta,
} from '@orkestrel/docs'
import { withDocsSandbox, createPackage } from './setup'

describe('helpers', () => {
	test('computeGuidesHash and computeApiHash change with content mutations', async () => {
		await withDocsSandbox('helpers-hash', async (sandbox) => {
			const name = `hash-${process.pid}`
			const pkgDir = await createPackage(sandbox, name, { withGuides: true, srcContent: 'export const a = 1\n' })
			const guidesDir = path.join(pkgDir, 'guides')
			await sandbox.ensureFile(path.join(guidesDir, 'a.md'), '# A\n')
			const typedocBase = path.join(pkgDir, 'typedoc.base.json')
			await sandbox.ensureFile(typedocBase, '{ "entryPoints": [] }')
			const g1 = await computeGuidesHash(pkgDir)
			const a1 = await computeApiHash(pkgDir, typedocBase)
			await sandbox.ensureFile(path.join(guidesDir, 'a.md'), '# A!\n')
			const g2 = await computeGuidesHash(pkgDir)
			expect(g2).not.toBe(g1)
			await sandbox.ensureFile(path.join(pkgDir, 'src', 'index.ts'), 'export const a = 2\n')
			const a2 = await computeApiHash(pkgDir, typedocBase)
			expect(a2).not.toBe(a1)
		})
	})

	test('fileExists returns true for existing file and false for missing', async () => {
		await withDocsSandbox('helpers-exists', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'exists-' + process.pid, { withGuides: false })
			const target = path.join(pkgDir, 'x.txt')
			await sandbox.ensureFile(target, 'x')
			expect(await fileExists(target)).toBe(true)
			const missing = path.join(pkgDir, 'missing.txt')
			expect(await fileExists(missing)).toBe(false)
		})
	})

	test('walkDir produces deterministic listing for manually sorted comparison', async () => {
		await withDocsSandbox('helpers-walk', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'walk-' + process.pid, { withGuides: false })
			await sandbox.ensureFile(path.join(pkgDir, 'src', 'b.ts'), 'export const b = 1\n')
			await sandbox.ensureFile(path.join(pkgDir, 'src', 'a.ts'), 'export const a = 1\n')
			const all = await walkDir(path.join(pkgDir, 'src'))
			expect(all.length).toBe(3) // index.ts plus a.ts b.ts
			const sorted = [...all].sort()
			expect(sorted).toEqual(sorted.slice().sort())
		})
	})

	test('toBaseName strips scope and returns last segment', () => {
		expect(toBaseName('@scope/core')).toBe('core')
		expect(toBaseName('validator')).toBe('validator')
	})

	test('matchesFilter includes and excludes based on patterns', async () => {
		await withDocsSandbox('helpers-match', async (sandbox) => {
			const dir = path.join(sandbox.orkRoot, 'core')
			expect(matchesFilter('core', dir, [], true)).toBe(true)
			expect(matchesFilter('core', dir, ['core'], true)).toBe(true)
			expect(matchesFilter('core', dir, ['validator'], true)).toBe(false)
		})
	})

	test('loadCache returns default structure for missing or invalid file', async () => {
		await withDocsSandbox('helpers-cache-missing', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'cache-' + process.pid, { withGuides: false })
			const cachePath = path.join(pkgDir, 'cache.json')
			const cache = await loadCache(cachePath)
			expect(cache.version).toBe(1)
			expect(cache.packages).toEqual({})
			await sandbox.ensureFile(cachePath, '{"oops":1}')
			const cache2 = await loadCache(cachePath)
			expect(cache2.packages).toEqual({})
		})
	})

	test('saveCache writes file readable by loadCache', async () => {
		await withDocsSandbox('helpers-cache-save', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'cache-save-' + process.pid, { withGuides: false })
			const cachePath = path.join(pkgDir, 'cache.json')
			await saveCache(cachePath, { version: 1, packages: { x: { guidesHash: 'a', apiHash: 'b' } } })
			const loaded = await loadCache(cachePath)
			expect(loaded.packages.x.guidesHash).toBe('a')
		})
	})

	test('normalizeLlmsOutputs promotes nested outputs to root when missing', async () => {
		await withDocsSandbox('helpers-normalize', async (sandbox) => {
			const outDir = path.join(sandbox.root, 'some-output')
			const nested = path.join(outDir, 'deep', 'more')
			await sandbox.ensureFile(path.join(nested, 'llms.txt'), 'root\n')
			await sandbox.ensureFile(path.join(nested, 'llms-full.txt'), 'full\n')
			await normalizeLlmsOutputs(outDir)
			const rootLlms = await sandbox.readFile(path.join(outDir, 'llms.txt'), 'utf8').then(String)
			const rootFull = await sandbox.readFile(path.join(outDir, 'llms-full.txt'), 'utf8').then(String)
			expect(rootLlms).toMatch(/root/)
			expect(rootFull).toMatch(/full/)
		})
	})

	test('computeGuidesHash returns stable digest when guides missing', async () => {
		await withDocsSandbox('helpers-no-guides', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'no-guides-' + process.pid, { withGuides: false, srcContent: 'export const a=1\n' })
			const h1 = await computeGuidesHash(pkgDir)
			const h2 = await computeGuidesHash(pkgDir)
			expect(h1).toBe(h2)
		})
	})

	test('computeApiHash returns stable digest when src + typedoc base missing', async () => {
		await withDocsSandbox('helpers-no-src', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'no-src-' + process.pid, { srcContent: '' })
			await sandbox.remove(path.join(pkgDir, 'src'), { recursive: true, force: true })
			const a1 = await computeApiHash(pkgDir, path.join(pkgDir, 'typedoc.base.json'))
			const a2 = await computeApiHash(pkgDir, path.join(pkgDir, 'typedoc.base.json'))
			expect(a1).toBe(a2)
		})
	})

	test('api hash changes when typedoc base file content changes', async () => {
		await withDocsSandbox('helpers-typedoc-change', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'td-change-' + process.pid, { withGuides: false, srcContent: 'export const z=1\n' })
			const base = path.join(pkgDir, 'typedoc.base.json')
			await sandbox.ensureFile(base, '{"entryPoints":[]}')
			const h1 = await computeApiHash(pkgDir, base)
			await sandbox.ensureFile(base, '{"entryPoints":["src/index.ts"]}')
			const h2 = await computeApiHash(pkgDir, base)
			expect(h2).not.toBe(h1)
		})
	})

	test('getPackageMeta returns null for missing or invalid package.json and parses valid', async () => {
		await withDocsSandbox('helpers-meta', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'meta-' + process.pid, { withGuides: false })
			await sandbox.remove(path.join(pkgDir, 'package.json'), { force: true })
			const missing = await getPackageMeta(pkgDir)
			expect(missing).toBeNull()
			await sandbox.ensureFile(path.join(pkgDir, 'package.json'), '{"name": "pkg", "broken"')
			const invalid = await getPackageMeta(pkgDir)
			expect(invalid).toBeNull()
			await sandbox.ensureFile(path.join(pkgDir, 'package.json'), '{"name":"@scope/meta-pkg"}')
			const valid = await getPackageMeta(pkgDir)
			expect(valid?.name).toBe('@scope/meta-pkg')
		})
	})

	test('computeApiHash ignores test and dist files', async () => {
		await withDocsSandbox('helpers-api-ignore', async (sandbox) => {
			const pkgDir = await createPackage(sandbox, 'api-ignore-' + process.pid, { withGuides: false })
			const srcDir = path.join(pkgDir, 'src')
			await sandbox.ensureFile(path.join(srcDir, 'index.ts'), 'export const main=1\n')
			await sandbox.ensureFile(path.join(srcDir, 'ignored.test.ts'), 'export const testOnly=1\n')
			const distDir = path.join(pkgDir, 'dist')
			await sandbox.ensureDir(distDir)
			await sandbox.ensureFile(path.join(distDir, 'built.js'), 'console.log(1)')
			const base = path.join(pkgDir, 'typedoc.base.json')
			await sandbox.ensureFile(base, '{"entryPoints":[]}')
			const h1 = await computeApiHash(pkgDir, base)
			await sandbox.ensureFile(path.join(srcDir, 'ignored.test.ts'), 'export const testOnly=2\n')
			await sandbox.ensureFile(path.join(distDir, 'built.js'), 'console.log(2)')
			const h2 = await computeApiHash(pkgDir, base)
			expect(h2).toBe(h1)
			await sandbox.ensureFile(path.join(srcDir, 'index.ts'), 'export const main=2\n')
			const h3 = await computeApiHash(pkgDir, base)
			expect(h3).not.toBe(h1)
		})
	})
})
