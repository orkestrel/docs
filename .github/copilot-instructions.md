# Copilot Instructions

This repository family uses TypeScript-first, ESM-only packages with strict typing, deterministic behavior, and fast, mirrored tests. Follow these expectations when proposing code, refactors, or docs.

Goals and principles
- Determinism: same inputs → same outputs; keep ordering and comparison options stable.
- Strict typing: no `any`, no non‑null assertions (`!`), avoid unsafe casts; narrow from `unknown`.
- Small surface: prefer tiny, composable helpers; expand public API only with multi-site need.
- Portability: browser + Node compatible; avoid Node-only primitives in public APIs.

How to work (fast path)
- Source lives in `src/`; tests mirror in `tests/` with one test file per source file.
- Prefer real values over mocks; tests use Vitest.
- Common scripts (run if present):
    - `npm run check` — typecheck
    - `npm test` — unit tests (Vitest)
    - `npm run build` — build ESM and `.d.ts`
    - `npm run format` — lint/format

Coding conventions
- ESM-only. Package.json uses `"type": "module"`. Target modern Node/browsers.
- Public outputs favor `readonly`; avoid mutation in helpers.
- Keep helpers small and well-typed; document invariants where helpful.
- Centralize shared public types in `src/types.ts`. When adding options to a function, define a named `...Options` interface there and import it.

## Typing ethos (dedicated and comprehensive)

Core rules
- No `any`. No non‑null assertions (`!`). Avoid unsafe casts (`as unknown as T`).
- Accept `unknown` at external boundaries; validate first, then narrow.
- Prefer `readonly` in public shapes and return values; expose immutable views when sensible.
- Keep types honest: model nullability/optionality explicitly (`T | undefined` / optional fields), do not rely on runtime invariants that types don’t encode.

Boundaries and narrowing
- Write small, composable type guards for narrowing; export guards alongside the APIs they validate.
- Prefer positive guards over negative complements (TS cannot express exact set complements for most types). Provide `assert*` variants for fail-fast paths where appropriate.
- For discriminated unions, use explicit discriminants and helpers (e.g., `literalOf`, `discriminatedUnion`) instead of fragile tag checks.

Options objects
- Define a named `...Options` interface in `src/types.ts` for any exported function/class options.
- Document options as a single `@param` and list fields in the description or `@remarks` (TSDoc does not support dotted `@param`).
- Prefer boolean/enum flags that are orthogonal and stable; avoid ambiguous overloads when a single options object will do.

Immutability and collections
- Prefer `readonly T[]` and `ReadonlyArray<T>` for arrays; `ReadonlyMap<K, V>` and `ReadonlySet<T>` for collections.
- Do not mutate inputs; copy-on-write for internal state as needed. For performance-sensitive code, document any deliberate mutations and keep them internal.
- Public getters should not expose mutable references; return copies or readonly views.

Generics and inference
- Constrain generics to the minimum needed (e.g., `<T extends object>`). Avoid unconstrained `<T>` when callers lose useful inference.
- Prefer conditional and mapped types for derived shapes over excessive overloads. Keep overload counts small; favor discriminated unions + single implementation.
- Use `as const` where appropriate to preserve literal inference in examples and tests.

Error and diagnostics typing
- Define stable, structured error metadata (expected, path, label, receivedType/tag/preview, hint, helpUrl). Keep fields readonly.
- Where applicable, expose helpers to render locations (path arrays → strings) deterministically and cycle-safe previews that do not leak secrets.

Public API and module shape
- Centralize exported public types in `src/types.ts`. Do not scatter public `type`/`interface` declarations across files.
- Avoid ambient/global types. Keep exports explicit and tree-shake friendly.
- Keep constructor/factory inputs simple (tuple/object injection patterns for DI-style code). Avoid complex intersection types at boundaries unless necessary and well-documented.

Numbers, equality, and deep checks (when relevant)
- Be explicit about number semantics (e.g., strict numbers: `+0 !== -0`, `NaN === NaN` in deep equality).
- Document collection ordering semantics for Map/Set comparisons; surface flags like `compareMapOrder`/`compareSetOrder`.

Asynchrony and resources
- Keep providers/factories synchronous in core-style repos; move IO to lifecycle hooks.
- Type lifecycle hooks precisely; include per-phase timeout options as named fields in options types.

TSDoc interplay
- Public exported classes/functions require full TSDoc with `@example` fenced as `ts`.
- Do not add full TSDoc banners to types/interfaces; keep comments concise.
- For options objects, avoid dotted `@param`; list fields under `@remarks`.

Recommended tsconfig (guidance)
- Enable strict suite: `"strict": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`, `"noImplicitOverride": true`, `"useUnknownInCatchVariables": true`.
- Prefer modern module resolution: `"moduleResolution": "bundler"` in ESM-only packages.
- Keep declaration output clean: `"declaration": true`, `"stripInternal": true` for public packages.

Type testing and quality
- Keep `npm run check` clean alongside unit tests.
- Favor small compile-time “example” snippets in TSDoc that the typechecker validates. Avoid separate type-only test frameworks unless necessary.

Deep dive examples
```ts
// Boundary acceptance and narrowing
function parse(input: unknown): Result {
  assertRecord(input, { path: ['payload'] })
  // input now narrowed to Record<string, unknown> by the guard
  // ...
  return out as const
}
```

````ts
/**
 * Build a read‑only index from items with stable iteration order.
 *
 * Creates a `ReadonlyMap` keyed by `getKey(value)`. Order is deterministic and
 * follows the original `items` order (or the chosen conflict strategy). Inputs
 * are not mutated; generics are precise.
 *
 * @typeParam K - Key type returned by getKey (string/number recommended)
 * @typeParam V - Item type
 * @param items - Source items (accepted as readonly; not mutated)
 * @param getKey - Pure, deterministic key selector
 * @param options - Optional configuration
 * @remarks
 * Options:
 * - strategy — 'firstWins' | 'lastWins' (default: 'firstWins')
 * - throwOnDuplicate — when true and 'firstWins', throw on duplicate keys (default: true)
 * @returns A `ReadonlyMap<K, V>` with deterministic conflict handling
 * @example
 * ```ts
 * const users = [{ id: 'u1' }, { id: 'u2' }] as const
 * const byId = buildIndex(users, u => u.id)
 * byId.get('u1') // { id: 'u1' }
 * ```
* @example
* ```ts
* // Minimal conflict policy demonstration
* const xs = [{ id: 'a', n: 1 }, { id: 'a', n: 2 }] as const
* buildIndex(xs, x => x.id, { strategy: 'lastWins' }).get('a')?.n // 2
* // With 'firstWins' and throwOnDuplicate (default), duplicates throw a TypeError
* ```
*/
export function buildIndex<K extends string | number, V>(
items: readonly V[],
getKey: (v: V) => K,
options: Readonly<{ strategy?: 'firstWins' | 'lastWins'; throwOnDuplicate?: boolean }> = {},
): ReadonlyMap<K, V> { /* ... */ }
````

Tests and QA
- Mirror files: `tests/[file].test.ts` for each `src/[file].ts`.
- Keep runs fast; use short timers; deterministic assertions.
- Add tests for behavior changes; cover happy path + key edges.

## Repo profiles (repo-specific, explicit; add more later)
- @orkestrel/validator
    - Focus: guards, assertions, combinators, schema/builders, diagnostics, deep checks, emptiness predicates, pragmatic domain validators (UUID, ISO date/time, URL/HTTP URL, MIME, JSON, semver, etc.).
    - Assertions throw `TypeError` with structured metadata; tests pinpoint failing indices/keys via path.
    - Object builders: support `optional/exact/rest` with precise static types.
- @orkestrel/llms-txt
    - Focus: zero-deps Markdown→text transforms with deterministic whitespace rules.
    - Outputs: `llms.txt` (plain) and `llms-full.txt` (full). Preserve fenced code verbatim; textualize links/images; optionally rewrite and validate links.
    - CLI + API parity; validation with bounded concurrency/timeouts. Prefer simple, stable transforms over full Markdown AST fidelity.
- @orkestrel/core
    - Focus: tokens/ports, synchronous providers (value/factory/class), deterministic `Lifecycle` and `Orchestrator` with timeouts and rollback.
    - No async providers; move IO to lifecycle hooks. Use stable diagnostic codes (e.g., ORK1006/1013/1014/1017/1021).
    - Built-in adapters: logger, diagnostics, queue, emitter, event bus, layering, registry. Tests exercise ordering, timeouts, and aggregated errors without mocks.

Pull requests and change control
- Keep diffs focused. Expand public API only with rationale and multi-site need.
- Update or add mirrored tests for any source change.
- Update TSDoc and guides/examples when behavior changes.
- Prefer small extensions to existing shapes over new abstractions.
- Do not add CI workflows in repos that explicitly avoid them; rely on local gates (`check`, `test`, `build`, `format`) unless stated otherwise.

Copilot Coding Agent expectations
- Before coding: run the setup steps in `.github/workflows/copilot-setup-steps.yml`, then run `npm run check`, `npm test`, `npm run build`, and `npm run format` if present.
- When generating code:
    - Add and update mirrored tests.
    - Respect strict typing; no `any`, no `!`.
    - Keep ESM-only imports/exports.
    - Follow TSDoc policy and use ```ts examples.
- When editing docs:
    - Keep examples copy‑pasteable.
    - Use `ts` fences and avoid leaking secrets or large payloads in previews.