import { describe, test, expect } from 'vitest'
import { spawn } from 'node:child_process'
import path from 'node:path'

function runCli(args: readonly string[], opts: { cwd?: string } = {}) {
  return new Promise<{ code: number | null, stdout: string, stderr: string }>((resolve) => {
    const child = spawn('node', [path.join(process.cwd(), 'dist', 'cli.js'), ...args], { cwd: opts.cwd ?? process.cwd(), shell: true })
    let stdout = '', stderr = ''
    child.stdout.on('data', d => { stdout += d.toString() })
    child.stderr.on('data', d => { stderr += d.toString() })
    child.on('close', code => resolve({ code, stdout, stderr }))
  })
}

describe('cli', () => {
  test('--help prints usage', async () => {
    const r = await runCli(['--help'])
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/Orkestrel docs orchestrator/i)
  })
})
