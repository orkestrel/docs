import { describe, test, expect } from 'vitest'
import {
	isSyncOptions,
	assertSyncOptions,
	isLlmsOptions,
	assertLlmsOptions,
	isOrkEslintOptions,
	assertOrkEslintOptions,
	isGenerateApiOptions,
	assertGenerateApiOptions,
} from '@orkestrel/docs'

const goodSync = { include: [], exclude: [], clean: false, hard: false, generateLlms: true, dryRun: false }
const badSync = { foo: 1 }

const goodLlms = { pkgDir: 'pkg', outDir: 'out', concurrency: 2 }
const badLlms = { pkgDir: 1 }

const goodEslint = { stylisticIndent: 'tab' }
const badEslint = { stylisticIndent: 'spaces' }

const goodApi = { pkgDir: 'pkg', outDir: 'out', entryPointStrategy: 'resolve' }
const badApi = { pkgDir: 'pkg' } // missing outDir

describe('validation guards & asserts', () => {
	test('isSyncOptions distinguishes valid and invalid', () => {
		expect(isSyncOptions(goodSync)).toBe(true)
		expect(isSyncOptions(badSync)).toBe(false)
	})

	test('assertSyncOptions throws on invalid input', () => {
		expect(() => assertSyncOptions(badSync)).toThrow()
	})

	test('isLlmsOptions validates required fields and optional numerics', () => {
		expect(isLlmsOptions(goodLlms)).toBe(true)
		expect(isLlmsOptions(badLlms)).toBe(false)
	})

	test('assertLlmsOptions throws on invalid llms options', () => {
		expect(() => assertLlmsOptions(badLlms)).toThrow()
	})

	test('isOrkEslintOptions validates stylisticIndent union', () => {
		expect(isOrkEslintOptions(goodEslint)).toBe(true)
		expect(isOrkEslintOptions(badEslint)).toBe(false)
	})

	test('assertOrkEslintOptions throws on invalid eslint options', () => {
		expect(() => assertOrkEslintOptions(badEslint)).toThrow()
	})

	test('isGenerateApiOptions validates required pkgDir/outDir', () => {
		expect(isGenerateApiOptions(goodApi)).toBe(true)
		expect(isGenerateApiOptions(badApi)).toBe(false)
	})

	test('assertGenerateApiOptions throws on invalid api options', () => {
		expect(() => assertGenerateApiOptions(badApi)).toThrow()
	})

	test('isOrkEslintOptions rejects invalid numeric indent', () => {
		expect(isOrkEslintOptions({ stylisticIndent: 3 })).toBe(false)
	})

	test('isGenerateApiOptions rejects invalid entryPointStrategy', () => {
		expect(isGenerateApiOptions({ pkgDir: 'pkg', outDir: 'out', entryPointStrategy: 'bogus' })).toBe(false)
	})

	test('isGenerateApiOptions rejects non-string entryPoints array member', () => {
		expect(isGenerateApiOptions({ pkgDir: 'pkg', outDir: 'out', entryPoints: ['src/index.ts', 5] })).toBe(false)
	})

	test('isLlmsOptions rejects invalid hard type', () => {
		expect(isLlmsOptions({ pkgDir: 'pkg', outDir: 'out', hard: 'yes' })).toBe(false)
	})

	test('isLlmsOptions accepts numeric concurrency but rejects non-number', () => {
		expect(isLlmsOptions({ pkgDir: 'pkg', outDir: 'out', concurrency: 5 })).toBe(true)
		expect(isLlmsOptions({ pkgDir: 'pkg', outDir: 'out', concurrency: 'high' })).toBe(false)
	})

	test('isSyncOptions rejects non-record llms field', () => {
		expect(isSyncOptions({ include: [], exclude: [], clean: false, hard: false, generateLlms: true, dryRun: false, llms: 'bad' })).toBe(false)
	})

	test('isSyncOptions rejects non-record typedoc field', () => {
		expect(isSyncOptions({ include: [], exclude: [], clean: false, hard: false, generateLlms: true, dryRun: false, typedoc: 'bad' })).toBe(false)
	})
})
