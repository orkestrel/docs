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
 * @example
 * ```ts
 * await copyGuides({
 *   pkgDir: '/path/to/pkg',
 *   guidesRel: 'guides',
 *   outDir: '/path/to/docs/packages/pkg/guides'
 * })
 * ```
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
