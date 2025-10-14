#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { runSync } from './runner'

/**
 * Print CLI usage.
 *
 * @returns void
 * @example
 * ```ts
 * printHelp()
 * ```
 */
function printHelp(): void {
	console.log(`orkdocs - Orkestrel docs orchestrator

Commands:
  sync                 Copy guides and generate API + LLMs docs into docs/packages/* (selective by cache)

Options:
  --include <name>     Only include specific packages by name or dir (repeatable)
  --exclude <name>     Exclude specific packages by name or dir (repeatable)
  --clean              Clean outputs before generation (only for changed targets)
  --hard               Hard docs run: include link validation in LLMs
  --no-llms            Disable LLMs outputs
  --dry-run            Print actions without making changes
  --help, -h           Show help`)
}

(async () => {
	const { positionals, values } = parseArgs({
		allowPositionals: true,
		options: {
			'include': { type: 'string', multiple: true },
			'exclude': { type: 'string', multiple: true },
			'clean': { type: 'boolean' },
			'hard': { type: 'boolean' },
			'no-llms': { type: 'boolean' },
			'dry-run': { type: 'boolean' },
			'help': { type: 'boolean', short: 'h' },
		},
	})

	const cmd = positionals[0] ?? ''

	if (values.help || !cmd) {
		printHelp()
		process.exit(0)
	}
	if (cmd !== 'sync') {
		console.error(`Unknown command: ${cmd}`)
		printHelp()
		process.exit(1)
	}

	try {
		await runSync({
			include: values.include ?? [],
			exclude: values.exclude ?? [],
			clean: Boolean(values.clean),
			hard: Boolean(values.hard),
			generateLlms: values['no-llms'] ? false : true,
			dryRun: Boolean(values['dry-run']),
		})

		console.log('Done.')
	}
	catch (err) {
		console.error('Error:', (err as { message?: string })?.message ?? err)
		process.exit(1)
	}
})()
