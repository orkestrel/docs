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
 * @example
 * ```ts
 * await generateApiDocs({
 *   pkgDir: '/path/to/pkg',
 *   outDir: '/path/to/out',
 *   baseConfigPath: '/path/to/typedoc.base.json'
 * })
 * ```
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
