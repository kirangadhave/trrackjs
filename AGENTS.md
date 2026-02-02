# Trrack

Trrack (**r**eproducible **track**ing) is a TypeScript library for action-based provenance tracking in web applications. It maintains a directed acyclic graph (DAG) of application states, enabling undo/redo, time-travel debugging, and full audit trails of user interactions.

## Project Vision

Trrack aims to be a lightweight, framework-agnostic provenance tracking solution with:
- **Enhancer pattern**: Composable store wrappers that extend functionality (planned architecture)
- **Simplicity**: Minimal dependencies, easy to understand and integrate
- **Performance**: Efficient handling of large provenance graphs
- **Great DX**: Excellent TypeScript inference and ergonomic APIs

## Repository Structure

```
trrackjs/
├── packages/
│   └── core/              # @trrack/core - Main provenance library (v2, fresh start)
├── docs/
│   └── design.md          # v2 architecture & design decisions
├── _reference/            # Archived v1 code for API reference
│   ├── .github/           # Old GitHub workflows (for reference when setting up CI)
│   ├── apps/              # Old example apps
│   ├── packages/          # Old package implementations
│   └── tools/             # Old Nx tools
└── ...config files
```

## Key Files

### Documentation
| File | Purpose |
|------|---------|
| @docs/design.md | v2 architecture decisions, type definitions, enhancer pattern |
| @AGENTS.md | Project overview, commands, conventions (this file) |
| @README.md | Public-facing documentation |

### Source (packages/core/)
| File | Purpose |
|------|---------|
| @packages/core/src/index.ts | Main entry point, public exports |
| @packages/core/package.json | Package config, dependencies, exports |
| @packages/core/tsconfig.json | TypeScript config for core package |
| @packages/core/tsup.config.ts | Build config (ESM, CJS, IIFE outputs) |

### Root Config
| File | Purpose |
|------|---------|
| @package.json | Workspace scripts, dev dependencies |
| @tsconfig.json | Base TypeScript config (extended by packages) |
| @vitest.config.ts | Test runner config |
| @biome.json | Linting & formatting rules |
| @lefthook.yml | Git hooks (pre-commit, commit-msg) |
| @commitlint.config.js | Conventional commit enforcement |
| @pnpm-workspace.yaml | Monorepo workspace definition |

## Tooling

<!-- Keep this section updated when tooling changes -->

| Tool | Purpose | Config |
|------|---------|--------|
| [pnpm](https://pnpm.io/) | Package manager & workspaces | `pnpm-workspace.yaml` |
| [TypeScript](https://www.typescriptlang.org/) 5.x | Type checking | `tsconfig.json` |
| [tsup](https://tsup.egoist.dev/) | Build & bundle (ESM, CJS, IIFE) | `packages/*/tsup.config.ts` |
| [Vitest](https://vitest.dev/) | Testing | `vitest.config.ts` |
| [Biome](https://biomejs.dev/) | Linting & formatting | `biome.json` |
| [lefthook](https://lefthook.dev/) | Git hooks | `lefthook.yml` |
| [commitlint](https://commitlint.js.org/) | Commit message linting | `commitlint.config.js` |
| [publint](https://publint.dev/) | Package.json exports validation | - |
| [attw](https://arethetypeswrong.github.io/) | TypeScript types validation | - |

## Commands

```bash
# Install dependencies
pnpm install

# Build
pnpm build                 # Build all packages
pnpm build:core            # Build core package only

# Testing
pnpm test                  # Run tests
pnpm test:watch            # Run tests in watch mode

# Code Quality
pnpm lint                  # Check linting
pnpm lint:fix              # Fix lint issues
pnpm format                # Format code
pnpm typecheck             # Type check all packages

# Clean
pnpm clean                 # Remove node_modules and dist

# Package Validation (run after build)
pnpm publint               # Validate package.json exports
pnpm attw                  # Validate TypeScript types work correctly
```

## Build Outputs

The core package produces multiple formats via tsup:

| Format | File | Use Case |
|--------|------|----------|
| ESM | `dist/index.js` | Modern bundlers, Node.js |
| CJS | `dist/index.cjs` | Legacy Node.js, older bundlers |
| IIFE | `dist/trrack.global.js` | `<script>` tag (exposes `window.Trrack`) |
| Types | `dist/index.d.ts` | TypeScript support |

## Core Concepts

### Provenance Graph
A DAG where each node represents application state after an action. The graph tracks:
- **RootNode**: Initial state (full snapshot)
- **StateNodes**: Subsequent states with parent references, events, and optional side effects

### State Storage
Intelligent switching between storage modes:
- **Checkpoint**: Full state snapshot (used when >50% of state changes)
- **Patches**: Incremental JSON patches referencing a checkpoint

### Actions & Registry
Actions are registered with metadata before use:
- **State-change actions**: `(state, payload) => void | State` - Immer-wrapped for safe mutations
- **Side-effect actions**: `(payload) => { do, undo }` - For external effects that need reversal

### Navigation
Uses Lowest Common Ancestor (LCA) algorithm for traversal between arbitrary nodes, applying/reverting side effects along the path.

### Metadata System
Nodes can have:
- **Artifacts**: Arbitrary data attachments
- **Metadata**: Typed key-value pairs (annotations, bookmarks, custom)

## v1 API Reference (in `_reference/`)

The old implementation is preserved in `_reference/packages/core/` for API design reference:

```typescript
// v1 Public API (for reference during v2 design)
interface Trrack<State, Event> {
  // State
  getState(node?): State
  current: ProvenanceNode
  root: RootNode

  // Actions
  apply(label, action): Promise<void>
  record(args): void

  // Navigation
  to(nodeId): Promise<void>
  undo(): Promise<void>
  redo(to?): Promise<void>

  // Listeners
  currentChange(listener): UnsubscribeHandler

  // Metadata
  metadata: { add, latestOfType, allOfType, latest, all, types }
  artifact: { add, latest, all }
  annotations: { add, latest, all }
  bookmarks: { add, remove, is, toggle }

  // Serialization
  export(): string
  import(graphString): void
  exportObject(): ProvenanceGraph
  importObject(graph): void
}
```

Key v1 files (in `_reference/packages/core/src/`):
- `provenance/trrack.ts` - Main Trrack class and initialization
- `provenance/types.ts` - Core type definitions
- `registry/reg.ts` - Action registration
- `graph/provenance-graph.ts` - Graph state management

## v2 Refactor Status

This is a **major version overhaul** (clean slate, no backwards compatibility):

- [x] **Simplify build system** - Removed Nx, using pnpm + tsup
- [x] **Modernize tooling** - TypeScript 5.x, Vitest, Biome, lefthook
- [x] **Package validation** - publint + attw for validating exports and types
- [ ] **Release management** - Set up changesets or semantic-release for versioning/changelogs
- [x] **Enhancer pattern design** - Builder API with type + runtime dependency checks (see `docs/design.md`)
- [ ] **API implementation** - Implement core + enhancers with TypeScript inference
- [ ] **Performance** - Optimize for large graphs and memory efficiency
- [ ] **New features** - Collaboration, persistence, visualization hooks

## Working with This Codebase

### Guidelines

- **Ask before major decisions** - Architecture, API design, dependency choices
- **Explore thoroughly** - Understand context before making changes
- **Keep it simple** - Avoid over-engineering; start minimal, add complexity when needed
- **Test changes** - Run `pnpm test` after modifications
- **Reference v1** - Check `_reference/packages/core/` for existing patterns and API design
- **Reference design doc** - Check `docs/design.md` for v2 architecture decisions
- **Update docs** - Keep README.md, AGENTS.md, and docs/design.md updated when things change

### Patterns in Use

- **Enhancer pattern** with builder API for extensibility (see `docs/design.md`)
- **Immer** for immutable state updates
- **Pub/sub** for event handling (via `withSubscription()` enhancer)

## Notes

- Testing conventions: Vitest with `*.test.ts` or `*.spec.ts` in `packages/*/tests/`
- Test fixtures: Use factories and constants from `tests/fixtures/` for consistency
- Commit conventions: Conventional commits (`feat:`, `fix:`, `chore:`, etc.)
- Scopes: `core`, `redux`, `docs`, `deps`, `release`

## CI/CD (TODO)

GitHub workflows are archived in `_reference/.github/workflows/`. When ready to set up CI:

**Workflows to create:**
1. **build_test.yml** - Run on PRs and non-release branches
   - Build all packages
   - Run tests
   - Lint check

2. **build_test_release.yml** - Run on main/release branches
   - Build, test, then semantic-release
   - Requires secrets: `NPM_TOKEN`, `GITHUB_TOKEN`

**Key differences from v1:**
- Use pnpm instead of yarn
- Use `pnpm build` and `pnpm test` instead of nx affected
- No nx-set-shas needed (simpler monorepo)
