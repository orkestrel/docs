import { beforeAll, afterAll } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Root under OS temp for all test artifacts
export const testRoot = path.join(os.tmpdir(), `orkdocs-tests-${process.pid}`)
let counter = 0

function alloc(label: string): string {
	counter++
	return path.join(testRoot, `${String(counter).padStart(2, '0')}-${label}`)
}

let origLog: typeof console.log
let origInfo: typeof console.info
let origWarn: typeof console.warn
let origError: typeof console.error
const suppressed = (..._args: unknown[]) => { /* suppressed */ }

beforeAll(async () => {
	origLog = console.log
	origInfo = console.info
	origWarn = console.warn
	origError = console.error
	await fs.rm(testRoot, { recursive: true, force: true })
	await fs.mkdir(testRoot, { recursive: true })
	console.log = suppressed
	console.info = suppressed
	console.warn = suppressed
	console.error = suppressed
})

afterAll(async () => {
	console.log = origLog
	console.info = origInfo
	console.warn = origWarn
	console.error = origError
	await fs.rm(testRoot, { recursive: true, force: true })
})

async function writeFileEnsured(p: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(p), { recursive: true })
    await fs.writeFile(p, content, 'utf8')
}

export async function captureConsole<T>(fn: () => Promise<T> | T, mode: 'real' | 'suppress' = 'real'): Promise<{ value: T, log: string }> {
	let logBuff = ''
	const collect = (...args: unknown[]) => { logBuff += args.map(String).join(' ') + '\n' }
	if (mode === 'real') {
		console.log = collect
		console.info = collect
		console.warn = collect
		console.error = collect
	}
	else {
		console.log = suppressed
		console.info = suppressed
		console.warn = suppressed
		console.error = suppressed
	}
	try {
		const value = await fn()
		return { value, log: logBuff }
	}
	finally {
		console.log = suppressed
		console.info = suppressed
		console.warn = suppressed
		console.error = suppressed
	}
}

export interface DocsSandbox {
	readonly root: string
	readonly orkRoot: string
	readonly docsDir: string
	ensureDir(relPath: string): Promise<string>
	ensureFile(relPath: string, content: string): Promise<string>
	exists(relPath: string): Promise<boolean>
	readFile(relPath: string, encoding?: BufferEncoding): Promise<string>
	readDir(relPath: string): Promise<readonly string[]>
	remove(relPath: string, opts?: { recursive?: boolean; force?: boolean }): Promise<void>
	stat(relPath: string): Promise<import('node:fs').Stats | null>
}

async function symlinkNodeModules(targetRoot: string): Promise<void> {
	try {
		const repoNodeModules = path.join(process.cwd(), 'node_modules')
		await fs.stat(repoNodeModules)
		const linkTarget = path.join(targetRoot, 'node_modules')
		try { await fs.rm(linkTarget, { recursive: true, force: true }) } catch {}
		await fs.symlink(repoNodeModules, linkTarget, process.platform === 'win32' ? 'junction' : 'dir')
	}
	catch { /* ignore */ }
}

/**
 * Execute a callback inside an isolated orkestrel/docs sandbox. Provides high-level helpers on the sandbox object.
 */
export async function withDocsSandbox<T>(label: string, fn: (sandbox: DocsSandbox) => Promise<T> | T): Promise<T> {
	const root = alloc(label)
	const orkRoot = path.join(root, 'orkestrel')
	const docsDir = path.join(orkRoot, 'docs')
	await fs.mkdir(docsDir, { recursive: true })
	await symlinkNodeModules(orkRoot)

	const sandbox: DocsSandbox = {
		root,
		orkRoot,
		docsDir,
		async ensureDir(relPath: string) {
			const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath)
			if (!abs.startsWith(root)) throw new Error('ensureDir path escapes sandbox root')
			await fs.mkdir(abs, { recursive: true })
			return abs
		},
		async ensureFile(relPath: string, content: string) {
			const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath)
			if (!abs.startsWith(root)) throw new Error('ensureFile path escapes sandbox root')
			await writeFileEnsured(abs, content)
			return abs
		},
		async exists(relPath: string) {
			const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath)
			if (!abs.startsWith(root)) return false
			try { await fs.access(abs); return true } catch { return false }
		},
		async readFile(relPath: string, encoding: BufferEncoding = 'utf8') {
			const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath)
			if (!abs.startsWith(root)) throw new Error('readFile path escapes sandbox root')
			return fs.readFile(abs, encoding).then(String)
		},
		async readDir(relPath: string) {
			const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath)
			if (!abs.startsWith(root)) throw new Error('readDir path escapes sandbox root')
			return fs.readdir(abs)
		},
		async remove(relPath: string, opts: { recursive?: boolean; force?: boolean } = {}) {
			const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath)
			if (!abs.startsWith(root)) throw new Error('remove path escapes sandbox root')
			await fs.rm(abs, { recursive: opts.recursive ?? false, force: opts.force ?? false })
		},
		async stat(relPath: string) {
			const abs = path.isAbsolute(relPath) ? relPath : path.join(root, relPath)
			if (!abs.startsWith(root)) return null
			try { return await fs.stat(abs) } catch { return null }
		},
	}

	const orig = process.cwd()
	process.chdir(docsDir)
	try {
		return await fn(sandbox)
	}
	finally {
		process.chdir(orig)
	}
}

export interface CreatePackageOptions {
    readonly withGuides?: boolean
    readonly srcContent?: string
    readonly packageName?: string
}

/**
 * Create a sibling package directory inside the sandbox orkRoot.
 * Mirrors the previous sandbox.createSibling behavior so tests remain unchanged.
 */
export async function createPackage(sandbox: DocsSandbox, name: string, opts: CreatePackageOptions = {}): Promise<string> {
    const pkgDir = path.join(sandbox.orkRoot, name)
    await fs.rm(pkgDir, { recursive: true, force: true })
    const srcDir = path.join(pkgDir, 'src')
    await fs.mkdir(srcDir, { recursive: true })
    await writeFileEnsured(path.join(pkgDir, 'package.json'), JSON.stringify({ name: opts.packageName ?? `@scope/${name}` }))
    await writeFileEnsured(path.join(srcDir, 'index.ts'), opts.srcContent ?? 'export const val=1\n')
    if (opts.withGuides !== false) {
        const guidesDir = path.join(pkgDir, 'guides')
        await fs.mkdir(guidesDir, { recursive: true })
        await writeFileEnsured(path.join(guidesDir, 'index.md'), '# Guides\n')
    }
    return pkgDir
}
