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
- **Tooling**
  - `pnpm check` script — runs typecheck + lint + test + build + publint + attw in one command
  - Vitest tests in `packages/*/tests/` (mirroring src structure)
  - Merged tsconfig for src + tests (vitest globals included)

### Design Decisions

- Engine layer lives in `src/internal/`, public API controlled via `src/index.ts`
- All plugins (core + user) in `@trrack/core`; separate packages for adapters/vis
- `addNode()` does NOT move current pointer — separated from `setCurrent()` for event system flexibility
- Nodes have `label` + `event` strings; additional metadata (category, tags, annotations) goes in `ext` via metadata plugin
