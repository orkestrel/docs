# orkestrel/docs

A documentation orchestrator for orkestrel projects.

- Run from orkestrel/docs with the parent directory named `orkestrel`
- Auto-discovers sibling packages (e.g., core, validator) and skips docs itself
- Copies each package’s guides into `docs/packages/<pkg>/guides`
- Generates TypeDoc API docs into `docs/packages/<pkg>/api` using a central TypeDoc config in this repo (with pass-through overrides)
- Generates `llms.txt` and `llms-full.txt` for each package by default (soft run), with `--hard` enabling link validation
- Uses hashing to skip unchanged work; cache stored at `docs/packages/cache.json`

## Repository layout

```
orkestrel/
  core/
  validator/
  llms-txt/
  docs/
    src/
    tests/
    guides/
    packages/
      cache.json
      <pkg>/
        api/
        guides/
        llms.txt
        llms-full.txt
```

## Install

```
npm install
npm run build
```

## CLI Usage

```
# Soft run (default): guides + api + llms (no link validation); selective by cache
npm run sync

# Hard run: adds link validation for LLMs outputs
npm run sync:hard

# Clean outputs before generating (only for changed targets)
npm run sync:clean

# Help (after build)
node dist\cli.js --help
```

Advanced flags (after build):
```
node dist\cli.js sync --include core --include validator --exclude docs --clean --hard --no-llms --dry-run
```

TypeDoc dependency handling flags (after build):
```
# Auto-install dependencies when missing (default: true)
node dist\cli.js sync --typedoc-auto-install=true

# Disable auto-install to surface errors instead
node dist\cli.js sync --typedoc-auto-install=false

# Choose package manager for auto-install (auto-detected by lockfile when omitted)
node dist\cli.js sync --typedoc-pm pnpm
```

Notes:
- Auto-install runs per package directory (npm ci/install, pnpm install, or yarn install). In dry-run, it only logs the intended command.
- A `package.json` must exist in each package directory before TypeDoc generation.

## Programmatic API

All types are centralized in `src/types.ts` (strict typing, no `any`). Guards and assertions are exported to help narrow unknown inputs.

### Exports

- `createOrkestrelConfig(opts: OrkEslintOptions)` – Flat ESLint config (Nuxt + TS + TSDoc/JSDoc + restrictions). Pass-through: `nuxt` (merged), `extendRules`, `extendJsdocRules`, `extendTsdocRules`, `additionalConfigs`.
- `generateLlmsOutputs(opts: LlmsOptions)` – Wraps `@orkestrel/llms-txt.generateAll`.
  - Pass-through of every `GenerateConfig` field except `docsDir` (derived as `<pkgDir>/guides`).
  - `hard` forces `validateLinks: true` regardless of provided `validateLinks`.
  - `onValidateProgress` propagates to underlying generator.
  - `dryRun` is wrapper-only (not forwarded) and prints intended actions.
- `generateApiDocs(opts: GenerateApiOptions)` – Wraps TypeDoc `Application.bootstrap`.
  - Requires a `package.json` in `opts.pkgDir`.
  - Auto-detects entry points (index/main fallback to `expand` strategy). Override via `entryPoints`, `entryPointStrategy`, `tsconfig`.
  - `extraApplicationOptions` shallow-merged last to allow full access to TypeDoc bootstrap options.
  - Dependency handling:
    - `autoInstallDeps` (default: true) — when `package.json` declares dependencies and `node_modules` is missing, automatically install.
    - `packageManager` — `'npm' | 'pnpm' | 'yarn'` preferred tool when auto-installing (auto-detected by lockfile when omitted).
  - `dryRun` prints the resolved invocation and any planned installs without side effects.
- `runSync(opts: SyncOptions)` – Orchestrates guides/API/LLMs for all changed packages.
  - Pass-through: `llms` for LLM generator (minus `docsDir/outDir`), `typedoc` for TypeDoc overrides (`entryPoints`, `entryPointStrategy`, `tsconfig`, `extraApplicationOptions`, `autoInstallDeps` (default true), `packageManager`).
  - Hash-based skipping; `hard` and `generateLlms` control validation and inclusion.
  - `dryRun` prints all file operations without mutating.
- `copyGuides(opts: CopyGuidesOptions)` – Copies guides for a single package.
- `helpers` – Internal utilities (hashing, discovery) exposed for advanced tooling.
- Validation helpers: `isSyncOptions`, `assertSyncOptions`, `isLlmsOptions`, `assertLlmsOptions`, `isGenerateApiOptions`, `assertGenerateApiOptions`, `isOrkEslintOptions`, `assertOrkEslintOptions`.

### Example: Full Programmatic Flow

```ts
import {
  runSync,
  generateLlmsOutputs,
  generateApiDocs,
  createOrkestrelConfig,
  assertSyncOptions
} from '@orkestrel/docs'

// 1. ESLint flat config
export default await createOrkestrelConfig({
  stylisticIndent: 'tab',
  extendRules: { 'no-console': 'warn' }
})

// 2. Single package LLM generation with hard validation
await generateLlmsOutputs({
  pkgDir: 'packages/core',
  outDir: 'docs/packages/core',
  hard: true,
  concurrency: 8,
  timeoutMs: 5000,
  onValidateProgress: e => console.log('links', e.validated, '/', e.total)
})

// 3. Single package API docs with extra TypeDoc options
await generateApiDocs({
  pkgDir: 'packages/core',
  outDir: 'docs/packages/core/api',
  baseConfigPath: 'typedoc.base.json',
  entryPoints: ['packages/core/src/index.ts'],
  extraApplicationOptions: { treatWarningsAsErrors: true }
  // autoInstallDeps defaults to true; to disable: autoInstallDeps: false
})

// 4. Multi-package orchestrated sync (dry run)
const syncCfg: unknown = {
  include: [],
  exclude: [],
  clean: false,
  hard: true,
  generateLlms: true,
  dryRun: true,
  typedoc: { entryPointStrategy: 'expand' },
  llms: { concurrency: 4 }
}
assertSyncOptions(syncCfg)
await runSync(syncCfg) // narrowed
```

### Type Design Notes

- All public option objects use readonly fields and avoid mutation.
- Pass-through fields mirror underlying library types for full control.
- Wrapper-only flags (`hard`, `dryRun`) modify or bypass internal behavior deterministically.
- No non-null assertions (`!`) or `any`; narrowing helpers are provided instead.

## Auto-discovery

- Auto-discovers sibling packages (directories with a package.json) under the parent `orkestrel` folder.
- Hashing ensures unchanged packages are skipped.

## TypeDoc

- Central base config at `typedoc.base.json`.
- Override entry points/strategy per package via `GenerateApiOptions` or `SyncOptions.typedoc`.

## LLMs

- Based on `@orkestrel/llms-txt` (Markdown → deterministic text transforms).
- `hard` run forces link validation.
- Outputs normalized to root of each package docs folder.

## ESLint Shared Config

This repo exports `createOrkestrelConfig()` (Flat config) that:
- Pulls @nuxt/eslint-config/flat
- Adds TypeScript rule hardening
- Enforces TSDoc syntax + JSDoc rules for public API
- Restricts type/interface declarations to `src/types.ts`
- Ignores `guides/**` and generated `packages/**/api/**`

Usage in a package:
```js
// eslint.config.mjs
import { createOrkestrelConfig } from '@orkestrel/docs/eslint'
export default await createOrkestrelConfig({ stylisticIndent: 'tab', allowTypesFile: 'src/types.ts' })
```

## Cache

- `docs/packages/cache.json` tracks per-package `guidesHash` and `apiHash`.
- Only changed packages are rebuilt.

## Development

Scripts:
- `npm run check` — typecheck
- `npm test` — tests (Vitest)
- `npm run format` — ESLint autofix
- `npm run build` — compile TypeScript

See guides in `guides/` for concepts, start, tips, and contribute.