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
