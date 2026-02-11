# Changelog

All notable changes to this project will be documented in this file.
Used to generate PR descriptions during release.

## [Unreleased] — v2.0.0-alpha.0

### Breaking Changes

- Replaced `immer` dependency with `mutative` (~10x faster, same API)
- Replaced `EventData` object with separate `event` (machine-readable) and `label` (human-readable) fields on nodes
- Updated `apply()` signature: `apply(event, label, recipe)` instead of `apply(eventData, recipe)`

### Added

- **Graph data structure** (`src/internal/graph.ts`)
  - `createGraph(config)` — creates provenance graph with root node
  - `getNode(graph, id)` — retrieve node by id (throws on missing)
  - `getRoot(graph)` / `getCurrent(graph)` — convenience accessors
  - `addNode(graph, node)` — add state node, update parent's children
  - `setCurrent(graph, id)` — move current pointer
- **Node types** (`src/internal/types.ts`)
  - Branded `NodeId` type (compile-time safety, no accidental string assignment)
  - `RootNode<State>` / `StateNode<State>` / `ProvenanceNode<State>`
  - `CheckpointStorage<State>` / `PatchStorage` / `StateStorage<State>` — discriminated union for forward-only state resolution
  - `ProvenanceGraph<State>` — DAG with nodes map, root/current pointers, ext bag
- **ID generation** (`src/internal/node-id.ts`)
  - `nodeId()` cast helper, `defaultGenerateId()` via `crypto.randomUUID()`, configurable via `createIdGenerator()`
- **Type guards** (`src/internal/guards.ts`)
  - `isRootNode()` / `isStateNode()` with TypeScript type narrowing
- **State storage** (`src/internal/state.ts`)
  - `resolveState(graph, nodeId)` — walks from nearest checkpoint ancestor, applies patches in order via Mutative's `applyPatches`
  - `produceNextState(currentState, recipe)` — Mutative `create` with patches enabled, returns new state + forward patches (inverse patches discarded)
- **Checkpoint strategy** (`src/internal/checkpoint.ts`)
  - `CheckpointStrategy.always` / `.never` / `.threshold(config)` — built-in strategies
  - `CheckpointContext<State>` — chain length, cumulative patch count, patches, new/previous state
  - Smart default: checkpoint when `chainLength >= 10` OR `cumulativePatchCount >= 50`
- **`LabelLike<State>` type** — labels can be a string or a function of `{ newState, previousState }`
- **TrrackCore kernel** (`src/internal/trrack-core.ts`)
  - `createTrrackCore(config)` — factory that creates the stateful kernel
  - `record(event, label, newState, patches)` — low-level node commit (internal API)
  - `register(event, config)` → `TrrackAction<Args>` — typed action registry with `LabelLike` labels
  - `apply(action, ...args)` — public API: produces state via registered recipe, resolves label, commits node
  - `getState()` — returns current state (O(1)); `getState(id)` resolves from checkpoint
  - `setCurrent(id)` — moves current pointer and resolves state (for navigation)
  - Checkpoint strategy evaluated on each record
- **Public API types** (`src/types.ts`)
  - `Trrack<State>` — public interface with `register`, `apply`, `getState`, `getNode`, `current()`, `root()`
  - `TrrackCore<State> extends Trrack<State>` — internal interface adding `record`, `setCurrent`, `graph()`, `generateId()`, `initialState()`
  - `TrrackAction<Args>` — opaque action handle with phantom-typed args
  - `ActionConfig<State, Args>` — action registration config (label + recipe)
- **Tooling**
  - `pnpm check` script — runs typecheck + lint + test + build + publint + attw in one command
  - Vitest tests in `packages/*/tests/` (mirroring src structure)
  - Merged tsconfig for src + tests (vitest globals included)

### Design Decisions

- Engine layer lives in `src/internal/`, public API controlled via `src/index.ts`
- All plugins (core + user) in `@trrack/core`; separate packages for adapters/vis
- `addNode()` does NOT move current pointer — separated from `setCurrent()` for event system flexibility
- Nodes have `label` + `event` strings; additional metadata (category, tags, annotations) goes in `ext` via metadata plugin
- `Trrack` = public API, `TrrackCore extends Trrack` = internal API for plugins — methods everywhere (no getters) for clean plugin composition via object spreading
- Public `apply()` is registry-based: users `register()` actions, then `apply(action, ...args)`. Internal `record()` takes pre-computed state + patches (no recipe, no double-produce)
- `LabelLike` resolution happens in `apply()` after producing state — labels can reference `newState`/`previousState`
