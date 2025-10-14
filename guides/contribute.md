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
    - For options interfaces, it's okay to add short one‑line comments for the interface and its members
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
