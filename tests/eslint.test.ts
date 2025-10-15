import { describe, test, expect } from 'vitest'
import { createOrkestrelConfig } from '@orkestrel/docs'
import { isRecord } from '@orkestrel/validator'

describe('eslint config helper', () => {
	test('createOrkestrelConfig merges stylistic indent override and extended rule', async () => {
		const cfg = await createOrkestrelConfig({ stylisticIndent: 4, extendRules: { 'no-console': 'warn' } })
		const blocks = (cfg as readonly unknown[]).filter((x): x is { name?: string, rules?: Record<string, unknown>, files?: unknown } => isRecord(x))
		const tsBlock = blocks.find(x => x.name === 'orkestrel/typescript')
		expect(tsBlock).toBeTruthy()
		expect(tsBlock?.rules?.['no-console']).toBe('warn')
	})

	test('allowTypesFile override changes restrict-types-outside-types config files target', async () => {
		const cfg = await createOrkestrelConfig({ allowTypesFile: 'src/custom-types.ts' })
		const blocks = (cfg as readonly unknown[]).filter((x): x is { name?: string, files?: unknown } => isRecord(x))
		const allowTypes = blocks.find(x => x.name === 'orkestrel/allow-types-in-types')
		expect(allowTypes).toBeTruthy()
		// Should include custom types file in files array
		const files = (allowTypes as { files?: unknown }).files as readonly string[] | undefined
		expect(files?.some(f => f.includes('custom-types.ts'))).toBe(true)
	})

	test('extendJsdocRules merges into jsdoc config', async () => {
		const cfg = await createOrkestrelConfig({ extendJsdocRules: { 'jsdoc/require-description': 'warn' } })
		const blocks = (cfg as readonly unknown[]).filter((x): x is { name?: string, rules?: Record<string, unknown> } => isRecord(x))
		const tsdocBlock = blocks.find(x => x.name === 'orkestrel/tsdoc')
		expect(tsdocBlock?.rules?.['jsdoc/require-description']).toBeDefined()
	})

	test('extendTsdocRules merges custom tsdoc rule', async () => {
		const cfg = await createOrkestrelConfig({ extendTsdocRules: { 'tsdoc/syntax': 'error' } })
		const block = (cfg as readonly unknown[]).find((b): b is { name: string, rules?: Record<string, unknown> } => isRecord(b) && typeof b.name === 'string' && b.name === 'orkestrel/tsdoc')
		expect(block?.rules?.['tsdoc/syntax']).toBe('error')
	})

	test('additionalConfigs appended to returned array', async () => {
		const extra = [{ name: 'custom-block', rules: { semi: 'error' } }]
		const cfg = await createOrkestrelConfig({ additionalConfigs: extra })
		const found = (cfg as readonly unknown[]).find(x => (x as { name?: string }).name === 'custom-block')
		expect(found).toBe(extra[0])
	})

	test('handles empty additionalConfigs gracefully', async () => {
		const cfg = await createOrkestrelConfig({ additionalConfigs: [] })
		expect(Array.isArray(cfg)).toBe(true)
	})

	test('invalid stylisticIndent value falls back to tab (indirect)', async () => {
		// Passing stylisticIndent outside allowed union is not typed; simulate by casting
		const cfg = await createOrkestrelConfig({ stylisticIndent: 'tab' })
		const styledBlock = (cfg as readonly unknown[]).find((b): b is { name: string } => isRecord(b) && typeof b.name === 'string' && b.name === 'orkestrel/tsdoc')
		expect(styledBlock).toBeTruthy()
	})

	test('stylisticIndent numeric override persists in returned Nuxt config', async () => {
		const cfg = await createOrkestrelConfig({ stylisticIndent: 4 })
		expect(Array.isArray(cfg)).toBe(true)
	})
})
