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
 * @example
 * ```ts
 * await runSync({
 *   include: [],
 *   exclude: [],
 *   clean: false,
 *   hard: false,
 *   generateLlms: true,
 *   dryRun: false
 * })
 * ```
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
