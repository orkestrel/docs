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
 * @example
 * ```ts
 * const config = await createOrkestrelConfig({ stylisticIndent: 'tab' })
 * export default config
 * ```
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
