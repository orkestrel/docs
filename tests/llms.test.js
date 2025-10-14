'use strict'
var __importDefault = (this && this.__importDefault) || function (mod) {
	return (mod && mod.__esModule) ? mod : { default: mod }
}
Object.defineProperty(exports, '__esModule', { value: true })
const vitest_1 = require('vitest')
const node_fs_1 = require('node:fs')
const node_path_1 = __importDefault(require('node:path'))
const node_os_1 = __importDefault(require('node:os'))
const llms_1 = require('../src/llms')

let tmp = '';
(0, vitest_1.beforeAll)(async () => {
	tmp = node_path_1.default.join(node_os_1.default.tmpdir(), `docs-llms-${process.pid}`)
	await node_fs_1.promises.rm(tmp, { recursive: true, force: true })
	await node_fs_1.promises.mkdir(tmp, { recursive: true })
});
(0, vitest_1.afterAll)(async () => { await node_fs_1.promises.rm(tmp, { recursive: true, force: true }) });
(0, vitest_1.test)('programmatic llms generation writes llms.txt and llms-full.txt', async () => {
	const pkgDir = node_path_1.default.join(tmp, 'pkg')
	const guides = node_path_1.default.join(pkgDir, 'guides')
	await node_fs_1.promises.mkdir(guides, { recursive: true })
	await node_fs_1.promises.writeFile(node_path_1.default.join(guides, 'index.md'), '# Home\n\nWelcome.\n', 'utf8')
	const outRoot = node_path_1.default.join(tmp, 'out', 'pkg')
	await (0, llms_1.generateLlmsOutputs)({ pkgDir, outDir: outRoot, hard: false })
	const llm = await node_fs_1.promises.readFile(node_path_1.default.join(outRoot, 'llms.txt'), 'utf8').then(String)
	const full = await node_fs_1.promises.readFile(node_path_1.default.join(outRoot, 'llms-full.txt'), 'utf8').then(String);
	(0, vitest_1.expect)(llm.length).toBeGreaterThan(0);
	(0, vitest_1.expect)(full.length).toBeGreaterThan(0)
})
