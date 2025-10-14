# orkestrel/docs

A documentation orchestrator for orkestrel projects.

- Run from orkestrel/docs with the parent directory named `orkestrel`
- Auto-discovers sibling packages (e.g., core, validator) and skips docs itself
- Copies each package's guides into `docs/packages/<pkg>/guides`
- Generates TypeDoc API docs into `docs/packages/<pkg>/api` using a central TypeDoc config in this repo
- Generates `llms.txt` and `llms-full.txt` for each package by default (soft run), with `--hard` enabling link validation
- Uses hashing to skip unchanged work; cache stored at `docs/packages/cache.json`

No runtime dependencies beyond devDependencies. The CLI uses Node built-ins; TypeDoc and @orkestrel/llms-txt are devDependencies.

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
pnpm install
pnpm build
```

## Usage

```
# Soft run (default): guides + api + llms (no link validation); selective by cache
pnpm sync

# Hard run: adds link validation
pnpm sync:hard

# Clean outputs before generating (only for changed targets)
pnpm sync:clean

# Help (after build)
node dist/cli.js --help
```

Advanced flags (after build):
```
node dist/cli.js sync \
  --include core --include validator \
  --exclude docs \
  --clean \
  --hard \
  --no-llms \
  --dry-run
```

## Auto-discovery

- Auto-discovers sibling packages (directories with a package.json) under the parent `orkestrel` folder.
- No docs.config.json is supported or needed.

## TypeDoc

- Central base config at `typedoc.base.json`; no per-package typedoc.json needed.
- Entry points auto-detected (src/index.ts, src/main.ts, etc.); if none found, expands `src/`.

## LLMs

- Programmatic call to `@orkestrel/llms-txt`.
- Soft run writes:
  - `docs/packages/<pkg>/llms.txt`
  - `docs/packages/<pkg>/llms-full.txt`
- Hard run (`--hard`) enables `validateLinks: true`.

## ESLint shared config

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

- `docs/packages/cache.json` tracks per-package:
  - `guidesHash` over `<pkg>/guides/**`
  - `apiHash` over `<pkg>/src/**` and `typedoc.base.json`
- Only changed packages are rebuilt. Missing packages that exist in cache are ignored.

## Development

- `pnpm check` — typecheck
- `pnpm test` — run tests (Vitest)
- `pnpm format` — ESLint autofix
- `pnpm build` — compile TypeScript

See guides in `guides/` for concepts, start, tips, and contribute.
