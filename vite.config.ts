import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const __rootdir = path.resolve(__dirname)

// Vite bundles only the CLI; library entries (index/eslint) are emitted by tsc
export default defineConfig({
	root: path.resolve(__rootdir, 'src'),
	resolve: {
		alias: {
			'@orkestrel/docs': path.resolve(__rootdir, 'src', 'index.ts'),
		},
	},
	build: {
		sourcemap: true,
		emptyOutDir: false,
		outDir: path.resolve(__rootdir, 'dist'),
		rollupOptions: {
			input: {
				cli: path.resolve(__rootdir, 'src', 'cli.ts'),
			},
			external: [
				...builtinModules,
				/^node:.*/,
				'typedoc',
			],
			output: {
				entryFileNames: (chunkInfo) => {
					if (chunkInfo.name === 'cli') return 'cli.js'
					return '[name].js'
				},
				format: 'es',
			},
		},
	},
})
