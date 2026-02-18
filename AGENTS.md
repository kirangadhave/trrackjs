# Trrack

Trrack (**r**eproducible **track**ing) is a TypeScript library for action-based provenance tracking in web applications. It maintains a DAG of application states, enabling undo/redo, time-travel debugging, and full audit trails.

## Tech Stack

- Language: TypeScript 5.x
- Build: tsup (ESM + CJS)
- Test: Vitest
- Lint/Format: Biome
- Package Manager: pnpm (workspaces)
- Git Hooks: lefthook, commitlint

## Commands

```bash
pnpm install            # Install dependencies
pnpm build              # Build all packages
pnpm test               # Run tests
pnpm lint               # Check linting
pnpm lint:fix           # Fix lint issues
pnpm format             # Format code
pnpm typecheck          # Type check all packages
```

## Repository Structure

```
trrackjs/
├── packages/
│   └── core/           # @trrack/core - Main library
├── AGENTS.md           # Project instructions (this file)
├── CLAUDE.md           # Points to AGENTS.md
├── TODO.md             # Current tasks and progress
├── CHANGE_DRAFT.md     # Running PR context (design decisions, rationale)
└── LICENSE
```

## Key Files

- `TODO.md` — Current tasks and progress. Check when resuming work. Keep updated as tasks complete or new ones arise. Reset after each PR merge.
- `CHANGE_DRAFT.md` — Running scratchpad for PR descriptions. Record design decisions, rationale behind changes, trade-offs considered, and anything useful for PR context that doesn't belong in a commit message. Reset after each PR merge.
- `DESIGN.md` — Architecture and design decisions (when it exists). Update when design decisions change.

## Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Scopes: `core`
- Tests: `*.test.ts` or `*.spec.ts` in `packages/*/tests/`
- Test fixtures in `tests/fixtures/` — always use fixtures for shared types and reusable helpers
- Prefer editing existing files over creating new ones

## Workflow

- **When resuming**: Check `TODO.md` for where things left off, pick up the next incomplete item.
- **Before modifying code**: Read the relevant source files first, understand existing patterns.
- **After completing work**: Update `TODO.md` to mark tasks done and add any new tasks discovered.
- **When committing**: Update `CHANGE_DRAFT.md` with what was done and why — design decisions, trade-offs, context that would be useful in a PR description.
- **When design decisions are made**: Record them in `DESIGN.md`.
- **After changes**: Run `pnpm test`.
- **After PR merge**: Reset both `TODO.md` and `CHANGE_DRAFT.md` for the next cycle.

## Guidelines

- Ask before major decisions (architecture, API design, dependency choices)
- Keep it simple — start minimal, add complexity when needed
- Run `pnpm test` after modifications
