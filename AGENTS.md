# Trrack

Trrack (**r**eproducible **track**ing) is a TypeScript library for action-based provenance tracking in web applications. It maintains a DAG of application states, enabling undo/redo, time-travel debugging, and full audit trails.

## Repository Structure

```
trrackjs/
├── packages/
│   └── core/           # @trrack/core - Main library (v2, fresh start)
├── _reference/         # Archived v1 code for API reference
└── ...config files
```

## Commands

```bash
pnpm install            # Install dependencies
pnpm build              # Build all packages
pnpm test               # Run tests
pnpm lint               # Check linting
pnpm lint:fix           # Fix lint issues
pnpm format             # Format code
pnpm typecheck          # Type check all packages
pnpm publint            # Validate package.json exports (after build)
pnpm attw               # Validate TypeScript types (after build)
```

## Tooling

pnpm workspaces, TypeScript 5.x, tsup (ESM + CJS), Vitest, Biome, lefthook, commitlint, publint, attw.

## Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Scopes: `core`, `redux`, `docs`, `deps`, `release`
- Tests: `*.test.ts` or `*.spec.ts` in `packages/*/tests/`
- Test fixtures in `tests/fixtures/`

## Guidelines

- Ask before major decisions (architecture, API design, dependency choices)
- Keep it simple — start minimal, add complexity when needed
- Run `pnpm test` after modifications
- v1 reference code is in `_reference/packages/core/src/`
