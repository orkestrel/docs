import { describe, test, expect } from 'vitest'
import { spawn } from 'node:child_process'
import path from 'node:path'

function runCli(args: readonly string[], opts: { cwd?: string } = {}) {
	return new Promise<{ code: number | null, stdout: string, stderr: string }>((resolve) => {
		const child = spawn('node', [path.join(process.cwd(), 'dist', 'cli.js'), ...args], { cwd: opts.cwd ?? process.cwd(), shell: true })
		let stdout = ''
		let stderr = ''
		child.stdout.on('data', (d) => {
			stdout += d.toString()
		})
		child.stderr.on('data', (d) => {
			stderr += d.toString()
		})
		child.on('close', code => resolve({ code, stdout, stderr }))
	})
}

describe('cli', () => {
	test('--help prints usage', async () => {
		const r = await runCli(['--help'])
		expect(r.code).toBe(0)
		expect(r.stdout).toMatch(/Orkestrel docs orchestrator/i)
	})

	test('unknown command exits with code 1 and prints error + help', async () => {
		const r = await runCli(['bogus'])
		expect(r.code).toBe(1)
		expect(r.stderr).toMatch(/Unknown command/i)
		expect(r.stdout).toMatch(/Commands:/)
	})

	test('sync dry-run completes and prints Done', async () => {
		// Use dry-run to avoid side effects; ensure command recognized
		const r = await runCli(['sync', '--dry-run'])
		expect(r.code).toBe(0)
		expect(r.stdout).toMatch(/Done\./)
	})

	test('no args prints help and exits 0', async () => {
		const r = await runCli([])
		expect(r.code).toBe(0)
		expect(r.stdout).toMatch(/Commands:/)
	})

	test('sync with unknown flag exits with code 1 and prints help/error', async () => {
		const r = await runCli(['sync', '--not-a-flag'])
		expect(r.code).toBe(1)
		expect(r.stderr + r.stdout).toMatch(/Unknown|Commands:/i)
	})
})
