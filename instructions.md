Below is the complete orkestrel/docs project scaffold with all required files, aligned to your constraints:
- Auto-discovery only (no docs.config.json)
- Central TypeDoc config in docs
- Programmatic @orkestrel/llms-txt integration (devDependency), soft vs hard runs
- Hash-based selective rebuild with packages/cache.json
- All utilities consolidated in src/helpers.ts
- ESLint flat helper createOrkestrelConfig
- Local guides, tests, CI, configs
- TSDoc on exported/public functions and strict typing (no any, no non-null assertions)

````markdown name=README.md
# orkestrel/docs

A documentation orchestrator for orkestrel projects.

- Run from orkestrel/docs with the parent directory named `orkestrel`
- Auto-discovers sibling packages (e.g., core, validator) and skips docs itself
- Copies each package’s guides into `docs/packages/<pkg>/guides`
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
````

```json name=package.json
{
  "name": "@orkestrel/docs",
  "version": "0.5.0",
  "private": true,
  "description": "Unified docs generator and CLI for orkestrel packages (auto-discovery + caching)",
  "bin": {
    "orkdocs": "dist/cli.js"
  },
  "exports": {
    "./eslint": {
      "types": "./dist/config/eslint.d.ts",
      "default": "./dist/config/eslint.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "check": "tsc -p tsconfig.json",
    "format": "eslint . --fix",
    "pretest": "npm run build",
    "test": "vitest run",
    "sync": "node dist/cli.js sync",
    "sync:clean": "node dist/cli.js sync --clean",
    "sync:hard": "node dist/cli.js sync --hard"
  },
  "devDependencies": {
    "@eslint/js": "^9.37.0",
    "@nuxt/eslint-config": "^1.9.0",
    "@typescript-eslint/eslint-plugin": "^8.11.0",
    "@typescript-eslint/parser": "^8.11.0",
    "@orkestrel/llms-txt": "file:../llms-txt",
    "eslint": "^9.37.0",
    "eslint-plugin-jsdoc": "^61.1.2",
    "eslint-plugin-tsdoc": "^0.4.0",
    "typedoc": "^0.25.13",
    "typescript": "^5.9.3",
    "vitest": "^3.2.4"
  },
  "engines": {
    "node": ">=18"
  }
}
```

```json name=tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "CommonJS",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "vitest"]
  },
  "include": ["src", "tests"]
}
```

```json name=typedoc.base.json
{
  "$schema": "https://typedoc.org/schema.json",
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**"
  ],
  "excludeInternal": true,
  "excludePrivate": true,
  "excludeExternals": false,
  "categorizeByGroup": true,
  "readme": "none",
  "includeVersion": true,
  "gitRevision": "main",
  "plugin": []
}
```

```yaml name=.github/workflows/ci.yml
name: CI
on:
  push:
    branches: [ main, "feat/**" ]
  pull_request:
    branches: [ main ]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22.x]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci || npm i
      - run: npm run check
      - run: npm run format
      - run: npm test
      - run: npm run build
```

```typescript name=vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __rootdir = resolve(__dirname)

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@orkestrel/docs': resolve(__rootdir, 'src', 'index.ts')
    }
  }
})
```

```javascript name=eslint.config.mjs
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import jsdoc from 'eslint-plugin-jsdoc'
import tsdoc from 'eslint-plugin-tsdoc'

// Generate Nuxt + TypeScript base config
const base = await createConfigForNuxt({
  features: { stylistic: { indent: 'tab' } },
})

// Project TypeScript rule hardening
const orkTs = {
  name: 'orkestrel/typescript',
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
  },
}

// Common AST selectors for exported declarations
const exportedFns = [
  'ExportNamedDeclaration > FunctionDeclaration',
  'ExportDefaultDeclaration > FunctionDeclaration',
]
const exportedClasses = [
  'ExportNamedDeclaration > ClassDeclaration',
  'ExportDefaultDeclaration > ClassDeclaration',
]
const exportedMethods = [
  'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="method"][accessibility!=private][accessibility!=protected]',
  'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="method"][accessibility!=private][accessibility!=protected]',
]
const exportedGetters = [
  'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="get"][accessibility!=private][accessibility!=protected]',
  'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="get"][accessibility!=private][accessibility!=protected]',
]
const exportedSetters = [
  'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="set"][accessibility!=private][accessibility!=protected]',
  'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="set"][accessibility!=private][accessibility!=protected]',
]

// Project-specific TSDoc/JSDoc rules
const tsdocConfig = {
  name: 'orkestrel/tsdoc',
  plugins: { jsdoc, tsdoc },
  settings: {
    jsdoc: { mode: 'typescript', tagNamePreference: { returns: 'returns' } },
  },
  rules: {
    'tsdoc/syntax': 'error',
    'jsdoc/no-types': 'error',
    'jsdoc/require-jsdoc': ['error', {
      publicOnly: { ancestorsOnly: false, cjs: true, esm: true },
      contexts: [
        ...exportedFns,
        ...exportedClasses,
        ...exportedMethods,
        ...exportedGetters,
        ...exportedSetters,
      ],
      checkConstructors: false,
    }],
    'jsdoc/require-description': ['error', {
      contexts: [
        ...exportedFns,
        ...exportedClasses,
        ...exportedMethods,
        ...exportedGetters,
        ...exportedSetters,
      ],
    }],
    'jsdoc/require-param': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
    'jsdoc/require-param-description': ['error', { contexts: [...exportedFns, ...exportedMethods] }],
    'jsdoc/require-returns': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
    'jsdoc/require-returns-description': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
    'jsdoc/require-example': ['error', { contexts: [...exportedFns, ...exportedMethods, ...exportedClasses] }],
  },
}

// Restrict type/interface declarations to the canonical src/types.ts file
const restrictTypesOutsideTypes = {
  name: 'orkestrel/restrict-types-outside-types',
  files: ['src/**/*.ts', 'src/**/*.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      { selector: 'TSTypeAliasDeclaration', message: 'Define type aliases only in src/types.ts.' },
      { selector: 'TSInterfaceDeclaration', message: 'Define interfaces only in src/types.ts.' },
    ],
  },
}

// Allow type/interface declarations within src/types.ts
const allowTypesInTypesFile = {
  name: 'orkestrel/allow-types-in-types',
  files: ['src/types.ts'],
  rules: {
    'no-restricted-syntax': 'off',
  },
}

export default [
  // Ignore generated artifacts
  { name: 'orkestrel/ignores', ignores: ['guides/**', 'packages/**/api/**'] },
  ...base,
  orkTs,
  ...jsdoc.configs.examples,
  tsdocConfig,
  restrictTypesOutsideTypes,
  allowTypesInTypesFile,
]
```

```gitignore name=.gitignore
node_modules
dist
.DS_Store
.tmp
.temp
packages/*/api
packages/*/llms.txt
packages/*/llms-full.txt
packages/cache.json
```

```typescript name=src/index.ts
export { createOrkestrelConfig } from "./config/eslint";
```

```typescript name=src/config/eslint.ts
/**
 * Orkestrel ESLint flat config helper (Nuxt + TS + TSDoc/JSDoc + project rules).
 *
 * Usage:
 *   import { createOrkestrelConfig } from '@orkestrel/docs/eslint'
 *   export default await createOrkestrelConfig({ stylisticIndent: 'tab', allowTypesFile: 'src/types.ts' })
 */
export interface OrkEslintOptions {
  readonly stylisticIndent?: "tab" | 2 | 4;
  readonly allowTypesFile?: string; // default "src/types.ts"
}

/**
 * Build a Flat config array composed from Nuxt's base config and project rules.
 *
 * @param opts - Optional configuration including stylistic indent and the allowed types file path
 * @returns Flat config array consumable by ESLint
 */
export async function createOrkestrelConfig(opts: OrkEslintOptions = {}): Promise<unknown[]> {
  const stylisticIndent = opts.stylisticIndent ?? "tab";
  const typesFile = opts.allowTypesFile ?? "src/types.ts";

  let createConfigForNuxt: (o: unknown) => Promise<unknown[]>;
  let jsdoc: { configs?: { examples?: unknown[] } };
  let tsdoc: unknown;

  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    ({ createConfigForNuxt } = await import("@nuxt/eslint-config/flat"));
  } catch {
    throw new Error("@nuxt/eslint-config is required in the consuming package's devDependencies.");
  }
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const m = await import("eslint-plugin-jsdoc");
    jsdoc = (m as unknown as { default?: typeof m; configs?: { examples?: unknown[] } }).default ?? (m as unknown as { configs?: { examples?: unknown[] } });
  } catch {
    throw new Error("eslint-plugin-jsdoc is required in the consuming package's devDependencies.");
  }
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    tsdoc = (await import("eslint-plugin-tsdoc")).default ?? (await import("eslint-plugin-tsdoc"));
  } catch {
    throw new Error("eslint-plugin-tsdoc is required in the consuming package's devDependencies.");
  }

  const base = (await createConfigForNuxt({
    features: { stylistic: { indent: stylisticIndent } },
  } as const)) as unknown[];

  const orkTs = {
    name: "orkestrel/typescript",
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-ignore": true, "ts-expect-error": "allow-with-description" }],
    },
  };

  const exportedFns = [
    'ExportNamedDeclaration > FunctionDeclaration',
    'ExportDefaultDeclaration > FunctionDeclaration',
  ];
  const exportedClasses = [
    'ExportNamedDeclaration > ClassDeclaration',
    'ExportDefaultDeclaration > ClassDeclaration',
  ];
  const exportedMethods = [
    'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="method"][accessibility!=private][accessibility!=protected]',
    'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="method"][accessibility!=private][accessibility!=protected]',
  ];
  const exportedGetters = [
    'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="get"][accessibility!=private][accessibility!=protected]',
    'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="get"][accessibility!=private][accessibility!=protected]',
  ];
  const exportedSetters = [
    'ExportNamedDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="set"][accessibility!=private][accessibility!=protected]',
    'ExportDefaultDeclaration > ClassDeclaration > ClassBody > MethodDefinition[kind="set"][accessibility!=private][accessibility!=protected]',
  ];

  const tsdocConfig = {
    name: "orkestrel/tsdoc",
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    plugins: { jsdoc: jsdoc as unknown, tsdoc },
    settings: {
      jsdoc: { mode: "typescript", tagNamePreference: { returns: "returns" } },
    },
    rules: {
      "tsdoc/syntax": "error",
      "jsdoc/no-types": "error",
      "jsdoc/require-jsdoc": ["error", {
        publicOnly: { ancestorsOnly: false, cjs: true, esm: true },
        contexts: [...exportedFns, ...exportedClasses, ...exportedMethods, ...exportedGetters, ...exportedSetters],
        checkConstructors: false,
      }],
      "jsdoc/require-description": ["error", { contexts: [...exportedFns, ...exportedClasses, ...exportedMethods, ...exportedGetters, ...exportedSetters] }],
      "jsdoc/require-param": ["error", { contexts: [...exportedFns, ...exportedMethods] }],
      "jsdoc/require-param-description": ["error", { contexts: [...exportedFns, ...exportedMethods] }],
      "jsdoc/require-returns": ["error", { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
      "jsdoc/require-returns-description": ["error", { contexts: [...exportedFns, ...exportedMethods, ...exportedGetters] }],
      "jsdoc/require-example": ["error", { contexts: [...exportedFns, ...exportedMethods, ...exportedClasses] }],
    },
  };

  const restrictTypesOutsideTypes = {
    name: "orkestrel/restrict-types-outside-types",
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "TSTypeAliasDeclaration", message: `Define type aliases only in ${typesFile}.` },
        { selector: "TSInterfaceDeclaration", message: `Define interfaces only in ${typesFile}.` },
      ],
    },
  };

  const allowTypesInTypesFile = {
    name: "orkestrel/allow-types-in-types",
    files: [typesFile],
    rules: { "no-restricted-syntax": "off" },
  };

  return [
    { name: "orkestrel/ignores", ignores: ["guides/**", "packages/**/api/**"] },
    ...base,
    orkTs,
    ...(jsdoc.configs?.examples ?? []),
    tsdocConfig,
    restrictTypesOutsideTypes,
    allowTypesInTypesFile,
  ];
}

export default createOrkestrelConfig;
```

```typescript name=src/helpers.ts
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";

/**
 * Check whether a path exists.
 *
 * @param p - Absolute or relative path to check
 * @returns True when the path exists
 */
export async function fileExists(p: string): Promise<boolean> {
  try { await fsp.access(p, fs.constants.F_OK); return true; } catch { return false; }
}

/**
 * Read a package.json and return its minimal metadata.
 *
 * @param pkgDir - Absolute path to a package directory
 * @returns Parsed package metadata or null if missing/invalid
 */
export async function getPackageMeta(pkgDir: string): Promise<Readonly<{ name?: string }> | null> {
  const pkgJson = path.join(pkgDir, "package.json");
  if (!(await fileExists(pkgJson))) return null;
  try { return JSON.parse(await fsp.readFile(pkgJson, "utf8")) as Readonly<{ name?: string }>; } catch { return null; }
}

/**
 * Convert a possibly scoped name to its base segment, e.g. "@scope/core" -> "core".
 *
 * @param name - Package name (scoped or unscoped)
 * @returns Base name without scope
 */
export function toBaseName(name: string): string {
  const parts = name.split("/");
  return parts[parts.length - 1] ?? name;
}

/**
 * Determine if a package matches include/exclude filters.
 *
 * @param baseName - The package base name (e.g., "core")
 * @param dir - Absolute path to the package directory
 * @param patterns - Patterns provided on CLI
 * @param defaultWhenEmpty - Default decision when no patterns provided
 * @returns True if matched
 */
export function matchesFilter(
  baseName: string,
  dir: string,
  patterns: readonly string[],
  defaultWhenEmpty: boolean
): boolean {
  if (!patterns?.length) return defaultWhenEmpty;
  const dirName = path.basename(dir);
  const nameVariants = new Set([baseName, dirName]);
  return patterns.some((p) => nameVariants.has(p) || dir.includes(p));
}

/**
 * Recursively walk a directory and collect file paths.
 *
 * @param absDir - Absolute directory to walk
 * @param files - Accumulator (for internal recursion)
 * @returns Array of absolute file paths
 */
export async function walkDir(absDir: string, files: string[] = []): Promise<string[]> {
  const entries = await fsp.readdir(absDir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(absDir, e.name);
    if (e.isDirectory()) files = await walkDir(abs, files);
    else if (e.isFile()) files.push(abs);
  }
  return files;
}

/**
 * Hash a single file by path and content.
 *
 * @param absPath - Absolute file path
 * @param hash - Crypto hash instance
 */
async function hashFile(absPath: string, hash: crypto.Hash): Promise<void> {
  const data = await fsp.readFile(absPath);
  hash.update(absPath);
  hash.update(data);
}

/**
 * Filter out files that should not influence API hashing.
 *
 * @param absPath - Absolute file path
 * @returns True if the file should be skipped
 */
function shouldSkipForApi(absPath: string): boolean {
  const rel = absPath.toLowerCase();
  if (rel.includes(`${path.sep}node_modules${path.sep}`)) return true;
  if (rel.includes(`${path.sep}dist${path.sep}`)) return true;
  if (rel.includes(`${path.sep}build${path.sep}`)) return true;
  if (rel.endsWith(".test.ts") || rel.endsWith(".spec.ts")) return true;
  return false;
}

/**
 * Compute a deterministic hash over all guides files.
 *
 * @param pkgDir - Absolute path to a package directory
 * @returns Hex digest representing the guides content
 */
export async function computeGuidesHash(pkgDir: string): Promise<string> {
  const guidesDir = path.join(pkgDir, "guides");
  const hash = crypto.createHash("sha256");
  if (!fs.existsSync(guidesDir)) {
    hash.update("no-guides");
    return hash.digest("hex");
  }
  const files = (await walkDir(guidesDir)).sort();
  for (const f of files) await hashFile(f, hash);
  return hash.digest("hex");
}

/**
 * Compute a deterministic hash over API sources and the central TypeDoc base config.
 *
 * @param pkgDir - Absolute path to a package directory
 * @param typedocBasePath - Absolute path to typedoc.base.json
 * @returns Hex digest representing the API inputs
 */
export async function computeApiHash(pkgDir: string, typedocBasePath: string): Promise<string> {
  const srcDir = path.join(pkgDir, "src");
  const h = crypto.createHash("sha256");
  if (!fs.existsSync(srcDir)) {
    h.update("no-src");
  } else {
    const files = (await walkDir(srcDir)).filter((f) => !shouldSkipForApi(f)).sort();
    for (const f of files) await hashFile(f, h);
  }
  if (fs.existsSync(typedocBasePath)) await hashFile(typedocBasePath, h);
  else h.update("no-typedoc-base");
  return h.digest("hex");
}

/**
 * Cache entry for a single package.
 */
export interface CacheEntry {
  readonly guidesHash: string;
  readonly apiHash: string;
  readonly updatedAt?: string;
}

/**
 * Cache file structure stored at docs/packages/cache.json.
 */
export interface CacheFile {
  readonly version: 1;
  readonly packages: Record<string, CacheEntry>;
}

/**
 * Load a cache file if it exists; otherwise return an empty cache.
 *
 * @param cachePath - Absolute path to cache.json
 * @returns Parsed cache
 */
export async function loadCache(cachePath: string): Promise<CacheFile> {
  try {
    const json = JSON.parse(await fsp.readFile(cachePath, "utf8")) as CacheFile;
    if (!json.version || !json.packages) throw new Error("Invalid cache file");
    return json;
  } catch {
    return { version: 1, packages: {} };
  }
}

/**
 * Persist a cache file to disk.
 *
 * @param cachePath - Absolute path to cache.json
 * @param cache - Cache data to save
 * @returns A promise that resolves when the file is written
 */
export async function saveCache(cachePath: string, cache: CacheFile): Promise<void> {
  await fsp.writeFile(cachePath, JSON.stringify(cache, null, 2), "utf8");
}

/**
 * Ensure LLM outputs exist at outDir root; move them from subfolders if needed.
 *
 * @param outDir - Target directory (docs/packages/<pkg>)
 * @param files - Expected filenames to normalize (defaults to llms files)
 * @returns A promise that resolves once normalization is complete
 */
export async function normalizeLlmsOutputs(
  outDir: string,
  files: readonly string[] = ["llms.txt", "llms-full.txt"]
): Promise<void> {
  await fsp.mkdir(outDir, { recursive: true });
  for (const name of files) {
    const rootTarget = path.join(outDir, name);
    if (await fileExists(rootTarget)) continue;

    // Search recursively for the file
    let foundPath: string | null = null;
    try {
      foundPath = (await walkDir(outDir)).find((p) => path.basename(p) === name) ?? null;
    } catch {
      // ignore traversal errors
    }

    if (!foundPath) {
      // Missing output is not fatal; the generator may have been configured differently
      // Consumers can decide to enforce presence via link validation (hard mode) in CI.
      continue;
    }

    // Move to root; fallback to copy+unlink if rename fails
    try {
      await fsp.rename(foundPath, rootTarget);
    } catch {
      try {
        await fsp.copyFile(foundPath, rootTarget);
        await fsp.unlink(foundPath);
      } catch {
        // If both rename and copy fail, leave as-is to avoid data loss.
      }
    }
  }
}
```

```typescript name=src/typedoc.ts
import path from "node:path";
import { Application, TSConfigReader, TypeDocReader } from "typedoc";
import { fileExists } from "./helpers";

/**
 * Options for API doc generation.
 */
export interface GenerateApiOptions {
  readonly pkgDir: string;
  readonly outDir: string;
  readonly baseConfigPath?: string;
  readonly tsconfig?: string;
  readonly entryPoints?: readonly string[];
  readonly entryPointStrategy?: "resolve" | "expand" | "packages";
  readonly dryRun?: boolean;
}

/**
 * Generate TypeDoc API documentation for a package using the central base config.
 *
 * @param opts - API generation options, including entry points and strategy
 * @returns A promise that resolves once docs are generated
 */
export async function generateApiDocs(opts: GenerateApiOptions): Promise<void> {
  const {
    pkgDir,
    outDir,
    baseConfigPath,
    tsconfig,
    entryPoints = [],
    entryPointStrategy = "resolve",
    dryRun,
  } = opts;

  if (dryRun) {
    const relBase = baseConfigPath ? path.relative(process.cwd(), baseConfigPath) : "(defaults)";
    const relEntries = entryPoints.length ? ` entryPoints=${entryPoints.map((e) => path.relative(pkgDir, e)).join(",")}` : "";
    // eslint-disable-next-line no-console
    console.log(`[dry-run] TypeDoc for ${pkgDir} -> ${outDir} (base: ${relBase})${relEntries} strategy=${entryPointStrategy}`);
    return;
  }

  const app = new Application();
  app.options.addReader(new TypeDocReader());
  app.options.addReader(new TSConfigReader());

  // Bootstrap with central config, then override dynamic options
  if (baseConfigPath && (await fileExists(baseConfigPath))) {
    app.bootstrap({
      // The TypeDoc options type is broad; we pass only known keys.
      // Casting to unknown avoids relying on TypeDoc's internal types.
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      options: baseConfigPath as unknown as string,
      tsconfig,
      entryPoints: entryPoints.length ? [...entryPoints] : undefined,
      entryPointStrategy,
    });
  } else {
    app.bootstrap({
      entryPoints: entryPoints.length ? [...entryPoints] : undefined,
      entryPointStrategy,
      tsconfig,
      excludePrivate: true,
      excludeInternal: true,
      categorizeByGroup: true,
      readme: "none",
      gitRevision: "main",
    } as Partial<Record<string, unknown>>);
  }

  const project = app.convert();
  if (!project) throw new Error(`TypeDoc conversion failed for ${pkgDir}`);

  await app.generateDocs(project, outDir);
  // eslint-disable-next-line no-console
  console.log(`Generated API docs: ${outDir}`);
}
```

```typescript name=src/guides.ts
import path from "node:path";
import fsp from "node:fs/promises";
import { fileExists } from "./helpers";

/**
 * Options to copy guides.
 */
export interface CopyGuidesOptions {
  readonly pkgDir: string;
  readonly guidesRel: string; // e.g., "guides"
  readonly outDir: string;    // docs/packages/<pkg>/guides
  readonly dryRun?: boolean;
}

/**
 * Copy a package's guides folder into the docs/packages/<pkg>/guides location.
 *
 * @param opts - Source package directory, relative guides path, and destination
 * @returns A promise that resolves when copying is complete
 */
export async function copyGuides(opts: CopyGuidesOptions): Promise<void> {
  const src = path.join(opts.pkgDir, opts.guidesRel);
  const dst = opts.outDir;

  if (!(await fileExists(src))) {
    // eslint-disable-next-line no-console
    console.log(`No guides found at ${src}; skipping.`);
    return;
  }

  if (opts.dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[dry-run] Copy guides ${path.relative(process.cwd(), src)} -> ${path.relative(process.cwd(), dst)}`);
    return;
  }

  await fsp.mkdir(dst, { recursive: true });
  await fsp.cp(src, dst, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log(`Copied guides: ${dst}`);
}
```

```typescript name=src/llms.ts
import path from "node:path";
import { normalizeLlmsOutputs } from "./helpers";
import { generateAll } from "@orkestrel/llms-txt";

/**
 * Options for generating LLM text outputs.
 */
export interface LlmsOptions {
  readonly pkgDir: string;
  readonly outDir: string; // docs/packages/<pkg>
  readonly dryRun?: boolean;
  readonly hard: boolean;  // when true, enable link validation
}

/**
 * Generate llms.txt and llms-full.txt for a package using @orkestrel/llms-txt.
 *
 * @param opts - LLM generation options
 * @returns A promise that resolves once outputs are written and normalized
 */
export async function generateLlmsOutputs(opts: LlmsOptions): Promise<void> {
  const { pkgDir, outDir, dryRun, hard } = opts;

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[dry-run] run @orkestrel/llms-txt programmatically for root=${pkgDir} out=${outDir} ${hard ? "(validate links)" : ""}`);
    return;
  }

  await generateAll({
    docsDir: path.join(pkgDir, "guides"),
    outDir,
    validateLinks: hard,
  });

  await normalizeLlmsOutputs(outDir, ["llms.txt", "llms-full.txt"]);
  // eslint-disable-next-line no-console
  console.log(`Generated LLMs text outputs in ${outDir}`);
}
```

```typescript name=src/runner.ts
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { generateApiDocs } from "./typedoc";
import { copyGuides } from "./guides";
import { generateLlmsOutputs } from "./llms";
import {
  fileExists,
  getPackageMeta,
  toBaseName,
  matchesFilter,
  computeApiHash,
  computeGuidesHash,
  loadCache,
  saveCache,
  type CacheFile,
} from "./helpers";

/**
 * Options for a docs synchronization run.
 */
export interface SyncOptions {
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly clean: boolean;
  readonly hard: boolean;          // enable link validation
  readonly generateLlms: boolean;  // default true; can be disabled
  readonly dryRun: boolean;
}

/**
 * Run the docs synchronization process:
 * - Validate parent folder is named 'orkestrel'
 * - Auto-discover sibling packages
 * - Hash inputs, copy guides, generate API, generate LLMs as needed
 * - Update docs/packages/cache.json
 *
 * @param options - Sync run options parsed from the CLI
 * @returns A promise that resolves when the run completes
 */
export async function runSync(options: SyncOptions): Promise<void> {
  const cwd = process.cwd();
  const parent = path.resolve(cwd, "..");
  const parentName = path.basename(parent);

  if (parentName !== "orkestrel") {
    throw new Error(
      `This tool must be run from orkestrel/docs with parent folder named 'orkestrel'. Found parent: '${parentName}'.`
    );
  }

  const docsPackagesRoot = path.join(cwd, "packages");
  if (!(await fileExists(docsPackagesRoot))) {
    if (options.dryRun) {
      // eslint-disable-next-line no-console
      console.log(`[dry-run] mkdir -p ${docsPackagesRoot}`);
    } else {
      await fsp.mkdir(docsPackagesRoot, { recursive: true });
    }
  }

  // Discover sibling packages (directories with package.json), except docs
  const entries = await fsp.readdir(parent, { withFileTypes: true });
  const candidates = entries
    .filter((e) => e.isDirectory())
    .map((e) => path.join(parent, e.name))
    .filter((dir) => path.basename(dir) !== "docs")
    .filter((dir) => fs.existsSync(path.join(dir, "package.json")));

  const discovered: Array<{ pkgDir: string; baseName: string }> = [];
  for (const pkgDir of candidates) {
    const meta = await getPackageMeta(pkgDir);
    if (!meta) continue;

    const baseName = toBaseName(meta.name ?? path.basename(pkgDir));
    const includeOk = matchesFilter(baseName, pkgDir, options.include, true);
    const excludeOk = !matchesFilter(baseName, pkgDir, options.exclude, false);
    if (!includeOk || !excludeOk) continue;

    discovered.push({ pkgDir, baseName });
  }

  if (!discovered.length) {
    // eslint-disable-next-line no-console
    console.log("No packages found matching filters.");
    return;
  }

  // Load cache
  const cachePath = path.join(docsPackagesRoot, "cache.json");
  const cache: CacheFile = await loadCache(cachePath);

  const typedocBasePath = path.join(cwd, "typedoc.base.json");

  for (const { pkgDir, baseName } of discovered) {
    const outRoot = path.join(docsPackagesRoot, baseName);
    const outGuides = path.join(outRoot, "guides");
    const outApi = path.join(outRoot, "api");

    const cached = cache.packages[baseName] ?? { guidesHash: "", apiHash: "" };

    // Compute current hashes
    const [guidesHash, apiHash] = await Promise.all([
      computeGuidesHash(pkgDir),
      computeApiHash(pkgDir, typedocBasePath),
    ]);

    const guidesChanged = guidesHash !== cached.guidesHash;
    const apiChanged = apiHash !== cached.apiHash;

    if (!guidesChanged && !apiChanged) {
      // eslint-disable-next-line no-console
      console.log(`Unchanged: ${baseName} (skipping)`);
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`\nProcessing ${baseName} at ${pkgDir}`);

    if (options.clean) {
      if (options.dryRun) {
        if (guidesChanged) console.log(`[dry-run] clean ${outGuides}`);
        if (apiChanged) console.log(`[dry-run] clean ${outApi}`);
      } else {
        if (guidesChanged) await fsp.rm(outGuides, { recursive: true, force: true });
        if (apiChanged) await fsp.rm(outApi, { recursive: true, force: true });
      }
    }

    // Guides
    if (guidesChanged) {
      await copyGuides({ pkgDir, guidesRel: "guides", outDir: outGuides, dryRun: options.dryRun });
    } else {
      // eslint-disable-next-line no-console
      console.log(`Guides unchanged for ${baseName} (skip copy)`);
    }

    // API via TypeDoc
    if (apiChanged) {
      // Determine entry points: common defaults -> expand src
      let entryPoints: string[] = [];
      let entryPointStrategy: "resolve" | "expand" = "resolve";
      const defaults = ["src/index.ts", "src/main.ts", "index.ts", "lib/index.ts"];
      const found: string[] = [];
      for (const rel of defaults) {
        const abs = path.join(pkgDir, rel);
        if (await fileExists(abs)) found.push(abs);
      }
      if (found.length) entryPoints = found;
      else { entryPoints = [path.join(pkgDir, "src")]; entryPointStrategy = "expand"; }

      const tsconfigFile = path.join(pkgDir, "tsconfig.json");
      await generateApiDocs({
        pkgDir,
        outDir: outApi,
        baseConfigPath: typedocBasePath,
        tsconfig: (await fileExists(tsconfigFile)) ? tsconfigFile : undefined,
        entryPoints,
        entryPointStrategy,
        dryRun: options.dryRun,
      });
    } else {
      // eslint-disable-next-line no-console
      console.log(`API unchanged for ${baseName} (skip TypeDoc)`);
    }

    // LLMs when any changed
    if (options.generateLlms && (guidesChanged || apiChanged)) {
      await generateLlmsOutputs({ pkgDir, outDir: outRoot, dryRun: options.dryRun, hard: options.hard });
    } else if (options.generateLlms) {
      // eslint-disable-next-line no-console
      console.log(`LLMs unchanged for ${baseName} (skip)`);
    }

    // Update cache
    cache.packages[baseName] = { guidesHash, apiHash, updatedAt: new Date().toISOString() };
  }

  // Save cache
  if (options.dryRun) {
    // eslint-disable-next-line no-console
    console.log(`[dry-run] write cache -> ${cachePath}`);
  } else {
    await saveCache(cachePath, cache);
  }
}
```

```typescript name=src/cli.ts
#!/usr/bin/env node

import { parseArgs } from "node:util";
import { runSync } from "./runner";

/**
 * Print CLI usage.
 *
 * @returns void
 */
function printHelp(): void {
  // eslint-disable-next-line no-console
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
  --help, -h           Show help`);
}

(async () => {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      include: { type: "string", multiple: true },
      exclude: { type: "string", multiple: true },
      clean: { type: "boolean" },
      hard: { type: "boolean" },
      "no-llms": { type: "boolean" },
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });

  const cmd = positionals[0] ?? "";

  if (values.help || !cmd) {
    printHelp();
    process.exit(0);
  }
  if (cmd !== "sync") {
    // eslint-disable-next-line no-console
    console.error(`Unknown command: ${cmd}`);
    printHelp();
    process.exit(1);
  }

  try {
    await runSync({
      include: values.include ?? [],
      exclude: values.exclude ?? [],
      clean: Boolean(values.clean),
      hard: Boolean(values.hard),
      generateLlms: values["no-llms"] ? false : true,
      dryRun: Boolean(values["dry-run"]),
    });
    // eslint-disable-next-line no-console
    console.log("Done.");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error:", (err as { message?: string })?.message ?? err);
    process.exit(1);
  }
})();
```

```typescript name=tests/cli.test.ts
import { describe, test, expect } from 'vitest'
import { spawn } from 'node:child_process'
import path from 'node:path'

function runCli(args: readonly string[], opts: { cwd?: string } = {}) {
  return new Promise<{ code: number | null, stdout: string, stderr: string }>((resolve) => {
    const child = spawn('node', [path.join(process.cwd(), 'dist', 'cli.js'), ...args], { cwd: opts.cwd ?? process.cwd(), shell: true })
    let stdout = '', stderr = ''
    child.stdout.on('data', d => { stdout += d.toString() })
    child.stderr.on('data', d => { stderr += d.toString() })
    child.on('close', code => resolve({ code, stdout, stderr }))
  })
}

describe('cli', () => {
  test('--help prints usage', async () => {
    const r = await runCli(['--help'])
    expect(r.code).toBe(0)
    expect(r.stdout).toMatch(/Orkestrel docs orchestrator/i)
  })
})
```

```typescript name=tests/hash.test.ts
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
```

```typescript name=tests/llms.test.ts
import { describe, test, beforeAll, afterAll, expect } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { generateLlmsOutputs } from '../src/llms'

let tmp = ''
beforeAll(async () => {
  tmp = path.join(os.tmpdir(), `docs-llms-${process.pid}`)
  await fs.rm(tmp, { recursive: true, force: true })
  await fs.mkdir(tmp, { recursive: true })
})
afterAll(async () => { await fs.rm(tmp, { recursive: true, force: true }) })

test('programmatic llms generation writes llms.txt and llms-full.txt', async () => {
  const pkgDir = path.join(tmp, 'pkg')
  const guides = path.join(pkgDir, 'guides')
  await fs.mkdir(guides, { recursive: true })
  await fs.writeFile(path.join(guides, 'index.md'), '# Home\n\nWelcome.\n', 'utf8')

  const outRoot = path.join(tmp, 'out', 'pkg')
  await generateLlmsOutputs({ pkgDir, outDir: outRoot, hard: false })

  const llm = await fs.readFile(path.join(outRoot, 'llms.txt'), 'utf8').then(String)
  const full = await fs.readFile(path.join(outRoot, 'llms-full.txt'), 'utf8').then(String)
  expect(llm.length).toBeGreaterThan(0)
  expect(full.length).toBeGreaterThan(0)
})
```

````markdown name=guides/start.md
# Start

Install
```sh
pnpm add -D @orkestrel/docs
```

Prerequisites
- Node.js 18+
- Monorepo with `orkestrel/` root
- Sibling packages (e.g., core, validator) with `guides/` and `src/`

Quick run
```sh
# From orkestrel/docs
pnpm install
pnpm build
pnpm sync          # soft run (guides + api + llms)
pnpm sync:hard     # add link validation
```

Outputs
- `docs/packages/<pkg>/guides`
- `docs/packages/<pkg>/api`
- `docs/packages/<pkg>/llms.txt`
- `docs/packages/<pkg>/llms-full.txt`
````

````markdown name=guides/concepts.md
# Concepts

Auto-discovery
- Scans parent `orkestrel` directory for packages (folders with `package.json`)
- Skips `docs` itself

Selective rebuilds
- Hash-based cache at `docs/packages/cache.json`
- Rebuild per package when guides or API sources change

TypeDoc
- Central config `typedoc.base.json`
- Entry points auto-detected (`src/index.ts`, etc.) else expands `src/`

LLMs
- Programmatic integration with `@orkestrel/llms-txt`
- Soft vs hard runs; hard enables `validateLinks`
````

````markdown name=guides/tips.md
# Tips

- Keep per-package guides under `guides/` and API entry at `src/index.ts`
- Prefer stable headings and link forms in guides
- Use `pnpm sync:hard` in CI to validate links across guides
- Ignore generated `packages/**/api/**` in lint configs
````

````markdown name=guides/contribute.md
# Contribute

A compact guide for making changes confidently.

Principles
- Determinism: same inputs → same outputs; stable transforms and whitespace rules
- Small surface: minimal, composable APIs
- Zero deps: keep runtime dependency-free (use devDependencies; Node built-ins at runtime)

Quick workflow (how to work)
1) Edit source in `src/`
2) Mirror tests in `tests/` (one test file per source file)
3) Run locally:
   - `pnpm run check` — typecheck everything
   - `pnpm test` — run unit tests with Vitest
   - `pnpm run build` — build CJS and types
   - `pnpm run format` — ESLint autofix

Typing ethos (strict, helpful, honest)
- No `any`. No non‑null assertions (`!`). Avoid unsafe casts; prefer narrowing
- Validate at the edges: accept `unknown`, check, then type
- Prefer `readonly` for public outputs; avoid mutating returned values
- Keep helpers small and well‑typed; document invariants where helpful
- All shared public types live in `src/types.ts` and are exported/imported from there
- Do not define new `type`/`interface` declarations outside `src/types.ts`
- When adding options to a function, create a named `...Options` interface in `src/types.ts` and import it

TSDoc policy (what to document)
- Public exported classes and their public methods: full TSDoc
    - Include: description, `@param` and `@returns` with descriptions, an `@example`, and `@remarks` if helpful
    - Examples must use fenced code blocks with the `ts` language tag (```ts)
- Exported functions: full TSDoc as above
- Simple getters and setters: no `@example`. Provide a concise description and meaningful `@returns`.
- Private methods, non‑exported classes/functions, and overload signatures: use a single‑line description comment only
- Types and interfaces: keep comments concise
    - Prefer single‑line comments for type and interface declarations, especially in `src/types.ts`
    - For options interfaces, it’s okay to add short one‑line comments for the interface and its members
- TSDoc does not support dotted `@param` names (e.g., `@param opts.foo`).
- For options objects, document a single parameter for the object, and list its properties in the description or under `@remarks`.
- Do not include type annotations in JSDoc; rely on TypeScript types.
- Avoid inline object types in parameter positions for exported functions. Define a named interface in `src/types.ts` and reference it; document its fields under `@remarks`.
- Adopted style for options objects
    - Use a single `@param` for the object and describe its fields under `@remarks`.
    - Do not write dotted `@param` names. Keep property details readable as a bullet list.
    - Keep `@example` small and copy‑paste friendly.

Consistency
- Diagnostics should be clear, path-aware, and include structured metadata
- Mirror test files and cover golden paths + key edge cases

API and change control
- Avoid expanding public API without concrete, multi-site need
- Prefer tiny extensions to existing shapes over new abstractions
- Keep semantics stable; evolve via narrowly scoped, additive methods with rationale

Testing conventions and QA
- Tests mirror source files: `tests/[file].test.ts`
- Use built-ins only where appropriate; prefer direct values over heavy mocks
- Cover edge cases where helpful; keep tests fast (seconds, not minutes)

Code of Conduct
- Be kind. Assume good intent. Discuss ideas, not people.
````
