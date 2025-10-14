import { describe, test, beforeAll, afterAll, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { computeGuidesHash, computeApiHash } from '../src/helpers'

let tmp = ''
beforeAll(async () => {
  tmp = path.join(os.tmpdir(), `docs-hash-${process.pid}`)
  await fs.rm(tmp, { recursive: true, force: true })
  await fs.mkdir(tmp, { recursive: true })
})
afterAll(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

test('guides and api hashes change with content', async () => {
  const pkg = path.join(tmp, 'pkg')
  const guides = path.join(pkg, 'guides')
  const src = path.join(pkg, 'src')
  await fs.mkdir(guides, { recursive: true })
  await fs.mkdir(src, { recursive: true })
  await fs.writeFile(path.join(guides, 'a.md'), '# A\n', 'utf8')
  await fs.writeFile(path.join(src, 'index.ts'), 'export const a = 1\n', 'utf8')

  const typedocBase = path.join(tmp, 'typedoc.base.json')
  await fs.writeFile(typedocBase, '{}', 'utf8')

  const g1 = await computeGuidesHash(pkg)
  const a1 = await computeApiHash(pkg, typedocBase)

  await fs.writeFile(path.join(guides, 'a.md'), '# A!\n', 'utf8')
  const g2 = await computeGuidesHash(pkg)
  expect(g2).not.toBe(g1)

  await fs.writeFile(path.join(src, 'index.ts'), 'export const a = 2\n', 'utf8')
  const a2 = await computeApiHash(pkg, typedocBase)
  expect(a2).not.toBe(a1)
})
