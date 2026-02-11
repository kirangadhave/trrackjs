# Trrack

Trrack (**r**eproducible **track**ing) is a TypeScript library for action-based provenance tracking in web applications. It maintains a DAG of application states, enabling undo/redo, time-travel debugging, and full audit trails.

## Key Files

- `DESIGN.md` — Architecture and design decisions. Read before implementation work. Update when design decisions change.
- `TODO.md` — Current tasks and progress. Check when resuming work. Keep updated as tasks complete or new ones arise.
- `_reference/` — Archived v1 code for API reference.

## Repository Structure

```
trrackjs/
├── .claude/
│   └── agents/
│       └── code-reviewer.md   # Isolated code review subagent
├── packages/
│   └── core/           # @trrack/core - Main library (v2, fresh start)
├── _reference/         # Archived v1 code for API reference
├── DESIGN.md           # v2 architecture and design decisions
├── TODO.md             # Task tracking
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

## Workflow

- **Before starting work**: Read `DESIGN.md` for architecture context and `TODO.md` for current tasks.
- **When resuming**: Check `TODO.md` for where things left off, pick up the next incomplete item.
- **During implementation**: Consult `DESIGN.md` for design decisions. If a decision isn't covered, ask before deciding.
- **After completing work**: Update `TODO.md` to mark tasks done and add any new tasks discovered.
- **When design changes**: Update `DESIGN.md` to reflect new decisions.

## Code Review

- **Use the `code-reviewer` subagent** for reviewing code changes. It runs in isolated context to keep the main conversation clean.
- Prefer subagents over inline review to avoid polluting the working context with verbose review output.
- Review focus: bugs, security, performance, correctness. No style nits.

## Guidelines

- The human writes most code; Claude reviews, tests, and enforces best practices
- Ask before major decisions (architecture, API design, dependency choices)
- Keep it simple — start minimal, add complexity when needed
- Run `pnpm test` after modifications
- v1 reference code is in `_reference/packages/core/src/`
