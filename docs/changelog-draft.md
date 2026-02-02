# Trrack v2 Changelog Draft

> This is a running log of changes made during the v2 refactor. It will be used to create the final CHANGELOG.md for the major release.

---

## Overview

Trrack v2 is a **complete rewrite** of the library with no backwards compatibility. The goals are:

- Minimal, tree-shakeable core
- Enhancer pattern for composable features
- Full TypeScript inference
- Modern tooling and build system
- Better performance for large provenance graphs

---

## Repository Restructuring

### Archived v1 Code

All v1 code has been moved to `_reference/` for API design reference:

- `_reference/packages/` - Old package implementations
- `_reference/apps/` - Old example applications
- `_reference/.github/` - Old CI workflows (for reference when setting up new CI)
- `_reference/tools/` - Old Nx tools

### New Structure

```
trrackjs/
├── packages/
│   └── core/           # @trrack/core - Fresh v2 implementation
│       ├── src/        # Source code
│       └── tests/      # Test files with fixtures
├── docs/
│   ├── design.md       # Architecture decisions
│   └── changelog-draft.md  # This file
└── ...config files
```

---

## Build System

### Removed

- **Nx** - Removed complex monorepo tooling
- **Yarn** - Replaced with pnpm
- **Multiple package configs** - Simplified to single workspace

### Added

- **pnpm workspaces** - Simple, fast package management
- **tsup** - Zero-config bundling with multiple output formats:
  - ESM (`dist/index.js`)
  - CJS (`dist/index.cjs`)
  - IIFE (`dist/trrack.global.js`) for `<script>` tag usage
  - Type declarations (`dist/index.d.ts`)

---

## Tooling

| Tool | Purpose |
|------|---------|
| TypeScript 5.x | Modern TS features, better inference |
| Vitest | Fast, modern test runner |
| Biome | Linting & formatting (replaces ESLint + Prettier) |
| lefthook | Git hooks (pre-commit, commit-msg) |
| commitlint | Conventional commit enforcement |
| publint | Package.json exports validation |
| attw | TypeScript types validation |

---

## Core Architecture

### Design Principles

1. **Enhancer pattern** - Features added via composable wrappers
2. **Builder API** - Type-safe chaining with dependency enforcement
3. **Minimal core** - Only fundamental provenance in base
4. **Automatic optimization** - Intelligent checkpoint vs patch storage

### Type System

New type definitions for provenance tracking:

```typescript
// State storage - checkpoint or patches
type StateStorage<State> =
  | { type: 'checkpoint'; value: State }
  | { type: 'patch'; patches: Patch[]; inversePatches: Patch[]; checkpointRef: string };

// Node types
interface RootNode<State> {
  type: 'root';
  id: string;
  state: { type: 'checkpoint'; value: State };
  children: string[];
  createdAt: number;
}

interface StateNode<State> {
  type: 'state';
  id: string;
  parent: string;
  event: EventData;
  state: StateStorage<State>;
  children: string[];
  createdAt: number;
}
```

### TrrackCore Implementation

The internal `TrrackCore` provides low-level provenance operations:

- `state` - Current resolved state
- `current` - Current node reference
- `root` - Root node reference
- `record(newState, event)` - Create new node
- `setCurrent(nodeId)` - Navigate to node
- `getState(nodeId)` - Resolve state for any node

### Checkpoint Strategy

Hybrid approach for deciding between checkpoint and patch storage:

| Config | Default | Purpose |
|--------|---------|---------|
| `maxChainLength` | 10 | Max nodes before forcing checkpoint |
| `maxPatchCount` | 20 | Max patch operations before checkpoint |
| `maxPatchRatio` | 0.5 | Max patch size relative to state |

Supports custom strategies:

```typescript
createTrrack({
  initialState,
  checkpoint: (ctx) => {
    // Custom logic
    return ctx.patches.some(p => p.path[0] === 'user');
  },
});
```

Presets available:
- `CheckpointPreset.ALWAYS` - Always use checkpoints
- `CheckpointPreset.NEVER` - Always use patches (requires `enablePatches: true`)

### State Resolution

Transparent state resolution from patches:

- Users always get resolved state via `trrack.state` or `trrack.getState(id)`
- Patches are applied automatically when reading
- Checkpoint references ensure bounded resolution time

---

## Testing Infrastructure

### Structure

Tests located in `packages/*/tests/` with shared fixtures:

```
packages/core/tests/
├── fixtures/
│   ├── index.ts      # Re-exports
│   ├── states.ts     # Test state types & constants
│   └── trrack.ts     # Factory functions
├── core.test.ts
├── checkpoint.test.ts
├── state-resolution.test.ts
└── types.test.ts
```

### Fixtures

**Factory Functions:**
- `createCounterTrrack()` - Basic counter, checkpoints only
- `createPatchTrrack()` - Large state, prefers patches
- `createCheckpointTrrack()` - Forces checkpoints
- `createCheckpointContext()` - For testing checkpoint logic

**State Constants:**
- `INITIAL_COUNTER` - `{ count: 0 }`
- `INITIAL_LARGE` - `{ count: 0, data: 'x'.repeat(1000) }`
- `INITIAL_COMPLEX` - Nested user/items/metadata

**Config Presets:**
- `CHECKPOINT_CONFIGS.forceCheckpoint`
- `CHECKPOINT_CONFIGS.preferPatches`
- `CHECKPOINT_CONFIGS.balanced`

---

## Planned Features (Not Yet Implemented)

### Default Enhancers (always included)
- `withNavigation()` - undo/redo/canUndo/canRedo
- `withSubscription()` - subscribe to changes

### Optional Enhancers
- `withRegistry()` - Typed action registration
- `withMetadata()` - Artifacts, bookmarks, annotations
- `withPersistence()` - Import/export, RFC 6902 conversion
- `withSideEffects()` - Side-effect actions with undo
- `withDevTools()` - Browser devtools integration
- `withCollaboration()` - Real-time multi-user sync

---

## Commit History

| Commit | Type | Description |
|--------|------|-------------|
| dfbba2e | docs | Add CLAUDE.md for AI-assisted development |
| 1b27fed | chore | Archive v1 code to _reference/ |
| 4762136 | refactor | Migrate to pnpm workspace with modern tooling |
| 502eb00 | docs | Update README and CLAUDE.md for v2 setup |
| b37811b | chore | Archive GitHub workflows for later reference |
| 575bd25 | chore | Ignore Claude local settings |
| d7f89a3 | chore | Modernize tooling with lefthook, publint, attw |
| 0d49a7b | docs | Add v2 architecture design document |
| 3fa03ae | docs | Add key files reference section |
| 555f421 | docs | Extract project instructions to AGENTS.md |
| 8473237 | feat | Add v2 type definitions |
| 23d2c27 | feat | Add utility functions for ID generation and size estimation |
| 11deabc | feat | Implement TrrackCore with checkpoint/patch storage |
| e417674 | test | Add comprehensive tests for TrrackCore |
| 762e60e | feat | Add enablePatches config and refactor core internals |
| c9b1441 | test | Add enablePatches config to tests and type guard tests |
| db06757 | refactor | Move tests to package-level tests/ folder with fixtures |
| fdf9fa6 | docs | Add test fixtures convention to AGENTS.md |

---

## Decision Log

See `docs/design.md` for detailed rationale. Key decisions:

| Decision | Rationale |
|----------|-----------|
| Enhancer pattern | Tree-shakeable, composable, third-party extensible |
| Builder API | Better type inference, explicit ordering |
| Immer patches | Already using Immer; inverse patches for undo |
| Hybrid checkpoint logic | Bounds resolution time, configurable |
| nanoid for IDs | Short, fast, collision-safe |

---

*Last updated: 2025-02-01*
