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
 * @example
 * ```ts
 * await generateLlmsOutputs({
 *   pkgDir: '/path/to/pkg',
 *   outDir: '/path/to/docs/packages/pkg',
 *   hard: false
 * })
 * ```
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
