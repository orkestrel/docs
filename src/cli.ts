#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { runSync } from './runner.js'
import type { ValidateProgress } from '@orkestrel/llms-txt'

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
  --typedoc-auto-install[=true|false]  Auto-install package dependencies if missing (default: true)
  --typedoc-pm <npm|pnpm|yarn>         Preferred package manager when auto-installing
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
			'typedoc-auto-install': { type: 'boolean' },
			'typedoc-pm': { type: 'string' },
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
		let wroteProgress = false
		const progressEnabled = Boolean(values.hard) && !values['no-llms']
		const onValidateProgress = progressEnabled
			? (e: ValidateProgress) => {
					const line = `Validating links: ${e.validated}/${e.total} (broken ${e.broken})`
					process.stdout.write(`\r${line}`)
					wroteProgress = true
				}
			: undefined

		await runSync({
			include: values.include ?? [],
			exclude: values.exclude ?? [],
			clean: Boolean(values.clean),
			hard: Boolean(values.hard),
			generateLlms: !values['no-llms'],
			dryRun: Boolean(values['dry-run']),
			llms: progressEnabled ? { onValidateProgress } : undefined,
			typedoc: {
				autoInstallDeps: values['typedoc-auto-install'] !== false, // default true unless explicitly false
				packageManager: values['typedoc-pm'] as 'npm' | 'pnpm' | 'yarn' | undefined,
			},
		})

		if (wroteProgress) process.stdout.write('\n')
		console.log('Done.')
	}
	catch (err) {
		console.error('Error:', (err as { message?: string })?.message ?? err)
		process.exit(1)
	}
})()
