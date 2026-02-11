# Trrack v2 — TODO

## Design (done)

- [x] Architecture: core engine + core plugins + user plugins
- [x] Core scope: graph, state storage, apply(), getState(), events, plugin system
- [x] Node structure: no inverse patches, forward-only resolution
- [x] Checkpoint strategy: smart defaults, configurable, overridable
- [x] Action tracker design: state recipes optional, async effects, dispatch()
- [x] Plugin data extension: ext bags on nodes + graph
- [x] Event catalog: core events, plugin event extension via declaration merging
- [x] Plugin hook signatures: RecordContext, NavigateContext, cancellable hooks
- [x] Navigation edge cases: branching redo, orphaned branches, direction types
- [x] Reactivity: state-change only, lean on Mutative structural sharing, no caching
- [x] findPath / LCA algorithm: TraversalPath type, O(depth) walkUp approach
- [x] Error handling: throws vs no-ops, effect failure strategy
- [x] Public API types: Trrack<State> (user-facing), TrrackCore<State> (plugin-facing)
- [x] Graph immutability: no pruning, graphs are sacred
- [x] Serialization integrity: manifest with trrack + plugin versions, major-version warnings on import
- [x] Structured events: EventData with label, type, category, tags
- [x] Mutative instead of Immer as producer (10x faster, same API)
- [x] Future plugins documented: URL sharing, duration tracking, persistence, read-only, framework adapters

## Structural decisions

- Engine layer: `src/internal/`
- All plugins (core + user) in `@trrack/core`
- Separate packages for adapters (`@trrack/react`, etc.) and vis libraries
- Dependency: mutative (not immer)

## Implementation

### Done: graph data structure + node types

- [x] Swap immer → mutative in package.json, pnpm install
- [x] `src/internal/types.ts` — NodeId, StateStorage, node types, ProvenanceGraph
- [x] `src/internal/node-id.ts` — nodeId() cast, defaultGenerateId, createIdGenerator
- [x] `src/internal/guards.ts` — isRootNode, isStateNode
- [x] `src/internal/graph.ts` — createGraph, getNode, getRoot, getCurrent, addNode, setCurrent
- [x] `src/internal/index.ts` — barrel export
- [x] `src/index.ts` — update package entry with re-exports
- [x] Tests: node-id, guards, graph (26 tests)
- [x] Verify: pnpm check (typecheck + lint + test + build + publint + attw)

### Done: state storage + checkpoint strategy

- [x] `src/internal/types.ts` — CheckpointStorage, PatchStorage, StateStorage, LabelLike
- [x] `src/internal/checkpoint.ts` — CheckpointContext, CheckpointConfig, CheckpointFn, CheckpointStrategy (always/never/threshold)
- [x] `src/internal/state.ts` — resolveState (walk from checkpoint + applyPatches), produceNextState (Mutative produce with patches)
- [x] `src/index.ts` — re-export checkpoint + state types and functions
- [x] Tests: checkpoint, state
- [x] Verify: pnpm check

### Up next: apply() + getState()

- [ ] Core: apply() + getState()
- [ ] Core: path finding (LCA)
- [ ] Core: event emitter
- [ ] Core: plugin system (registration, hooks, ext bags, builder)
- [ ] Core plugin: navigation
- [ ] Core plugin: reactivity
- [ ] Core plugin: serialization
- [ ] Core plugin: action tracker
- [ ] Plugin: metadata
- [ ] Plugin: ephemeral nodes
- [ ] Plugin: graph queries
