"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
function runCli(args, opts = {}) {
    return new Promise((resolve) => {
        const child = (0, node_child_process_1.spawn)('node', [node_path_1.default.join(process.cwd(), 'dist', 'cli.js'), ...args], { cwd: opts.cwd ?? process.cwd(), shell: true });
        let stdout = '', stderr = '';
        child.stdout.on('data', d => { stdout += d.toString(); });
        child.stderr.on('data', d => { stderr += d.toString(); });
        child.on('close', code => resolve({ code, stdout, stderr }));
    });
}
(0, vitest_1.describe)('cli', () => {
    (0, vitest_1.test)('--help prints usage', async () => {
        const r = await runCli(['--help']);
        (0, vitest_1.expect)(r.code).toBe(0);
        (0, vitest_1.expect)(r.stdout).toMatch(/Orkestrel docs orchestrator/i);
    });
});
