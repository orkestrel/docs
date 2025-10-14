# Start

Install
```sh
npm add -D @orkestrel/docs
```

Prerequisites
- Node.js 18+
- Monorepo with `orkestrel/` root
- Sibling packages (e.g., core, validator) with `guides/` and `src/`

Quick run
```sh
# From orkestrel/docs
npm install
npm build
npm sync          # soft run (guides + api + llms)
npm sync:hard     # add link validation
```

Outputs
- `docs/packages/<pkg>/guides`
- `docs/packages/<pkg>/api`
- `docs/packages/<pkg>/llms.txt`
- `docs/packages/<pkg>/llms-full.txt`
