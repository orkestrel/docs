import { describe, test, expect } from 'vitest'
import * as docs from '@orkestrel/docs'

describe('index exports', () => {
	test('exports expected primary functions', () => {
		const keys = Object.keys(docs).sort()
		expect(keys).toContain('createOrkestrelConfig')
		expect(keys).toContain('generateLlmsOutputs')
		expect(keys).toContain('generateApiDocs')
		expect(keys).toContain('runSync')
	})

	test('exports helpers and validation guards', () => {
		const keys = Object.keys(docs)
		expect(keys).toContain('fileExists')
		expect(keys).toContain('computeGuidesHash')
		expect(keys).toContain('computeApiHash')
		expect(keys).toContain('isSyncOptions')
		expect(keys).toContain('assertSyncOptions')
	})
})
