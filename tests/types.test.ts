import { describe, test, expect } from 'vitest'
import type { OrkEslintOptions, LlmsOptions, SyncOptions } from '@orkestrel/docs'

// Simple compile-time sanity (runtime placeholder)
function accept<T>(_x: T): true {
	return true
}

describe('public types', () => {
	test('option interfaces are structural objects', () => {
		const eslintOpts: OrkEslintOptions = { stylisticIndent: 'tab' }
		const llmsOpts: LlmsOptions = { pkgDir: 'pkg', outDir: 'out' }
		const syncOpts: SyncOptions = { include: [], exclude: [], clean: false, hard: false, generateLlms: true, dryRun: true }
		expect(accept(eslintOpts)).toBe(true)
		expect(accept(llmsOpts)).toBe(true)
		expect(accept(syncOpts)).toBe(true)
	})

	test('stylisticIndent accepts numeric values 2 and 4', () => {
		const o2: OrkEslintOptions = { stylisticIndent: 2 }
		const o4: OrkEslintOptions = { stylisticIndent: 4 }
		expect(accept(o2)).toBe(true)
		expect(accept(o4)).toBe(true)
	})
})
