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
