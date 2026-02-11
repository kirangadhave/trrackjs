# Trrack v2 — TODO

## Design (in progress)

- [x] Architecture: kernel vs core plugins vs user plugins
- [x] Kernel scope: graph, state storage, apply(), getState(), events, plugin system
- [x] Node structure: no inverse patches, forward-only resolution
- [x] Checkpoint strategy: smart defaults, configurable, overridable
- [x] Action tracker design: state recipes optional, async effects, dispatch()
- [x] Plugin data extension: ext bags on nodes + graph
- [x] Event catalog: kernel events, plugin event extension via declaration merging
- [x] Plugin hook signatures: RecordContext, NavigateContext, cancellable hooks
- [x] Navigation edge cases: branching redo, orphaned branches, direction types
- [x] Reactivity: state-change only, lean on Immer structural sharing, no caching
- [x] findPath / LCA algorithm: TraversalPath type, O(depth) walkUp approach
- [x] Error handling: throws vs no-ops, effect failure strategy
- [x] Public API types: Trrack<State> (user-facing), TrrackCore<State> (plugin-facing)
- [x] Graph immutability: no pruning, graphs are sacred
- [x] Serialization integrity: manifest with trrack + plugin versions, major-version warnings on import
- [x] Structured events: EventData with label, type, category, tags
- [x] Mutative instead of Immer as producer (10x faster, same API)
- [x] Future plugins documented: URL sharing, duration tracking, persistence, read-only, framework adapters

## Implementation (not started)

- [ ] Kernel: graph data structure + node types
- [ ] Kernel: state storage (checkpoint/patch, Immer integration)
- [ ] Kernel: apply() + getState()
- [ ] Kernel: path finding (LCA)
- [ ] Kernel: event emitter
- [ ] Kernel: plugin system (registration, hooks, ext bags, builder)
- [ ] Core plugin: navigation
- [ ] Core plugin: reactivity
- [ ] Core plugin: serialization
- [ ] Core plugin: action tracker
- [ ] User plugin: metadata
- [ ] User plugin: ephemeral nodes
- [ ] User plugin: graph queries
- [ ] Tests for all of the above
