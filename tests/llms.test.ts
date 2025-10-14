import { describe, test, beforeAll, afterAll, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { generateLlmsOutputs } from '../src/llms'

let tmp = ''
beforeAll(async () => {
  tmp = path.join(os.tmpdir(), `docs-llms-${process.pid}`)
  await fs.rm(tmp, { recursive: true, force: true })
  await fs.mkdir(tmp, { recursive: true })
})
afterAll(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

test('programmatic llms generation writes llms.txt and llms-full.txt', async () => {
  const pkgDir = path.join(tmp, 'pkg')
  const guides = path.join(pkgDir, 'guides')
  await fs.mkdir(guides, { recursive: true })
  await fs.writeFile(path.join(guides, 'index.md'), '# Home\n\nWelcome.\n', 'utf8')

  const outRoot = path.join(tmp, 'out', 'pkg')
  await generateLlmsOutputs({ pkgDir, outDir: outRoot, hard: false })

  const llm = await fs.readFile(path.join(outRoot, 'llms.txt'), 'utf8').then(String)
  const full = await fs.readFile(path.join(outRoot, 'llms-full.txt'), 'utf8').then(String)
  expect(llm.length).toBeGreaterThan(0)
  expect(full.length).toBeGreaterThan(0)
})
