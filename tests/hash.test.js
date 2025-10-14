"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_os_1 = __importDefault(require("node:os"));
const helpers_1 = require("../src/helpers");
let tmp = '';
(0, vitest_1.beforeAll)(async () => {
    tmp = node_path_1.default.join(node_os_1.default.tmpdir(), `docs-hash-${process.pid}`);
    await node_fs_1.promises.rm(tmp, { recursive: true, force: true });
    await node_fs_1.promises.mkdir(tmp, { recursive: true });
});
(0, vitest_1.afterAll)(async () => { await node_fs_1.promises.rm(tmp, { recursive: true, force: true }); });
(0, vitest_1.test)('guides and api hashes change with content', async () => {
    const pkg = node_path_1.default.join(tmp, 'pkg');
    const guides = node_path_1.default.join(pkg, 'guides');
    const src = node_path_1.default.join(pkg, 'src');
    await node_fs_1.promises.mkdir(guides, { recursive: true });
    await node_fs_1.promises.mkdir(src, { recursive: true });
    await node_fs_1.promises.writeFile(node_path_1.default.join(guides, 'a.md'), '# A\n', 'utf8');
    await node_fs_1.promises.writeFile(node_path_1.default.join(src, 'index.ts'), 'export const a = 1\n', 'utf8');
    const typedocBase = node_path_1.default.join(tmp, 'typedoc.base.json');
    await node_fs_1.promises.writeFile(typedocBase, '{}', 'utf8');
    const g1 = await (0, helpers_1.computeGuidesHash)(pkg);
    const a1 = await (0, helpers_1.computeApiHash)(pkg, typedocBase);
    await node_fs_1.promises.writeFile(node_path_1.default.join(guides, 'a.md'), '# A!\n', 'utf8');
    const g2 = await (0, helpers_1.computeGuidesHash)(pkg);
    (0, vitest_1.expect)(g2).not.toBe(g1);
    await node_fs_1.promises.writeFile(node_path_1.default.join(src, 'index.ts'), 'export const a = 2\n', 'utf8');
    const a2 = await (0, helpers_1.computeApiHash)(pkg, typedocBase);
    (0, vitest_1.expect)(a2).not.toBe(a1);
});
