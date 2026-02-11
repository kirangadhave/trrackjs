# Trrack v2 — Design Document

## Principles

- Tiny kernel, everything else is plugins (including core features)
- Core plugins are invisible to users — they see one flat API
- Type-safe plugin composition with runtime safety
- Simple mental model: forward-only state resolution from checkpoints
- Lean on Mutative's structural sharing — no caching, no deep equality
- Sync state mutations, async side effects (via action tracker)

## Architecture

```
┌──────────────────────────────────────────────┐
│           User API (flat, composed)          │
├──────────────────────────────────────────────┤
│  Core Plugins        │  User Plugins         │
│  (auto-included)     │  (opt-in)             │
│  ┌───────────────┐   │  ┌──────────────────┐ │
│  │ Navigation    │   │  │ Metadata         │ │
│  │ Reactivity    │   │  │ Ephemeral        │ │
│  │ Serialization │   │  │ Graph Queries    │ │
│  │ Action Tracker│   │  │ Custom...        │ │
│  └───────────────┘   │  └──────────────────┘ │
├──────────────────────────────────────────────┤
│                   Kernel                     │
│  - Graph (DAG, nodes, root/current)          │
│  - State storage (checkpoint/patch, Mutative) │
│  - apply(event, recipe)                      │
│  - getState(id?)                             │
│  - Path finding (LCA)                        │
│  - Event emitter                             │
│  - Plugin system (hooks, ext bags, registry) │
└──────────────────────────────────────────────┘
```

## Kernel

The kernel is the foundation. Not a plugin, can't be swapped.

### Graph

A directed acyclic graph (DAG) of provenance nodes. Each node has one parent (except root) and zero or more children. The graph tracks a `current` pointer and a `root` pointer.

### Node Structure

```typescript
type NodeId = string & { readonly __brand: unique symbol }

// Structured event data for provenance analysis
interface EventData {
  label: string          // human-readable, e.g. 'Applied price filter'
  type?: string          // machine-readable, e.g. 'filter.apply'
  category?: string      // grouping for analysis, e.g. 'data-manipulation'
  tags?: string[]        // flexible tagging for post-hoc analysis
}

interface NodeBase {
  id: NodeId
  type: 'root' | 'state'
  label: string
  createdAt: number
  children: NodeId[]
  ext: Record<string, unknown>   // plugin data, namespaced by plugin name
}

interface RootNode extends NodeBase {
  type: 'root'
  state: { type: 'checkpoint'; value: State }
}

interface StateNode extends NodeBase {
  type: 'state'
  parent: NodeId
  event: EventData
  state: StateStorage<State>
}

type ProvenanceNode = RootNode | StateNode
```

`NodeBase.label` is always `event.label` for state nodes, `'Root'` for root. Kept at top level for convenience.

### State Storage

No inverse patches. State resolution always walks forward from the nearest checkpoint.

```typescript
type StateStorage<State> =
  | { type: 'checkpoint'; value: State }
  | { type: 'patch'; patches: Patch[]; ref: NodeId; chainLength: number }
```

- `patches` — forward only (parent state → this node's state)
- `ref` — nearest checkpoint ancestor
- `chainLength` — number of patch nodes since last checkpoint

State resolution:

```
getState(nodeId):
  node = getNode(nodeId)
  if node.state.type === 'checkpoint':
    return node.state.value
  else:
    checkpoint = getNode(node.state.ref)
    walk from checkpoint to node, collecting patches
    apply patches in order to checkpoint.state.value
    return result
```

No per-node caching. Mutative's `applyPatches` uses structural sharing with the checkpoint state — unchanged subtrees keep the same references. This is sufficient for reactivity (see Reactivity section).

### Checkpoint Strategy

Determines when to store a full checkpoint vs patches.

```typescript
interface CheckpointContext<State> {
  chainLength: number              // nodes since last checkpoint
  cumulativePatchCount: number     // total patches in current chain
  patches: Patch[]                 // Mutative patches for this operation
  newState: State                  // already computed by produce()
  previousState: State             // already computed by produce()
}

interface CheckpointConfig {
  maxChainLength?: number          // default: 10
  maxPatchCount?: number           // default: 50 (cumulative in chain)
}

type CheckpointFn<State> = (ctx: CheckpointContext<State>) => boolean

type CheckpointStrategy<State> =
  | CheckpointConfig               // tweak thresholds
  | CheckpointFn<State>            // full control
  | 'always'                       // every node is a checkpoint
  | 'never'                        // only root is a checkpoint
```

Smart default: checkpoint when `chainLength >= 10` OR `cumulativePatchCount >= 50`.

### Current State

The kernel tracks one variable: `currentState`. This is the resolved state of the current node. Updated on `apply()` and navigation.

```typescript
let currentState: State = initialState
```

- `apply()` updates it via Mutative's `produce()` (structural sharing with previous)
- Navigation updates it via `resolveState()` using `applyPatches` (structural sharing with checkpoint)
- `getState()` with no args returns `currentState` directly — no resolution needed
- `getState(id)` for a specific node resolves fresh from checkpoint each time

### apply()

Kernel method. Synchronous. Creates a new state node.

```typescript
apply(event: string | EventData, recipe: (draft: Draft<State>) => void): void
```

First argument is either a string (shorthand for `{ label: string }`) or a full `EventData` object with analysis metadata.

```typescript
// Simple
t.apply('Increment', draft => { draft.count++ })

// With metadata for analysis
t.apply(
  { label: 'Applied filter', type: 'filter.apply', category: 'data' },
  draft => { draft.filter = 'active' }
)
```

Flow:
1. Normalize `event` — string becomes `{ label: event }`
2. Run `produceWithPatches(currentState, recipe)` → `[newState, patches]`
3. Evaluate checkpoint strategy → decide checkpoint or patch storage
4. Create `StateNode` with chosen storage and event data
5. Add node to graph as child of current
6. Update `currentState = newState`
7. Set current to new node
8. Emit events

### getState()

Kernel method.

```typescript
getState(): State              // returns currentState (no resolution)
getState(id: NodeId): State    // resolves from checkpoint for specific node
```

### Path Finding

LCA (Lowest Common Ancestor) algorithm for traversal between any two nodes. Used by navigation plugin for undo/redo/to.

### Event System

Typed pub/sub. Raw events are the plugin-level API — end users use reactivity instead.

Kernel events:

| Event | When | Payload | Cancellable |
|-------|------|---------|-------------|
| `record:before` | Before `apply()` creates a node | `RecordContext<State>` | Yes |
| `record:after` | After node added + current updated | `{ node, previousCurrent }` | No |
| `navigate:before` | Before `setCurrent()` | `NavigateContext` | Yes |
| `navigate:after` | After current pointer changed | `NavigateContext` | No |
| `graph:changed` | After any graph mutation | `{ type: 'record' \| 'navigate' }` | No |

Events are typed via an event map:

```typescript
interface TrrackEventMap<State> {
  'record:before':   RecordContext<State>
  'record:after':    { node: ProvenanceNode<State>; previousCurrent: NodeId }
  'navigate:before': NavigateContext
  'navigate:after':  NavigateContext
  'graph:changed':   { type: 'record' | 'navigate' }
}
```

**Plugin event extension**: Plugins can emit/listen to custom events. Typed via declaration merging:

```typescript
// In action tracker plugin
declare module '@trrack/core' {
  interface TrrackEventMap<State> {
    'effect:start': { action: string; args: unknown[] }
    'effect:end':   { action: string }
    'effect:error': { action: string; error: Error }
  }
}
```

Plugins that don't use declaration merging can still emit/listen — just untyped.

### Ext Bags

Both nodes and the graph have `ext: Record<string, unknown>`. Plugins namespace their data by plugin name. Serialization handles ext automatically (JSON by default, plugins can register custom serializers for non-JSON data).

Graph-level ext:

```typescript
interface ProvenanceGraph<State> {
  nodes: Map<NodeId, ProvenanceNode<State>>
  root: NodeId
  current: NodeId
  ext: Record<string, unknown>   // graph-level plugin data
}
```

### TrrackCore (internal, given to plugins)

The full internal API. Only visible to plugin code via `setup()`.

```typescript
interface TrrackCore<State> {
  // Graph
  getNode(id: NodeId): ProvenanceNode<State>
  getCurrent(): NodeId
  getRoot(): NodeId
  addNode(node: StateNode<State>): void
  setCurrent(id: NodeId): void

  // State
  apply(event: string | EventData, recipe: (draft: Draft<State>) => void): void
  getState(): State
  getState(id: NodeId): State

  // Path finding
  findPath(from: NodeId, to: NodeId): TraversalPath

  // Events
  on<E extends keyof TrrackEventMap<State>>(event: E, handler: (payload: TrrackEventMap<State>[E]) => void): () => void
  emit<E extends keyof TrrackEventMap<State>>(event: E, payload: TrrackEventMap<State>[E]): void

  // Plugin awareness
  hasPlugin(name: string): boolean

  // Config
  readonly initialState: Readonly<State>
}
```

### Trrack (public, returned by .build())

The end-user API. Kernel public methods + all plugin methods merged in.

```typescript
interface Trrack<State> {
  // Recording
  apply(event: string | EventData, recipe: (draft: Draft<State>) => void): void

  // State
  getState(): State
  getState(id: NodeId): State

  // Graph access
  readonly current: Readonly<ProvenanceNode<State>>
  readonly root: Readonly<RootNode<State>>
  getNode(id: NodeId): Readonly<ProvenanceNode<State>>
}

// After build(), the user sees:
// Trrack<State> & NavigationAPI & ReactivityAPI<State> & SerializationAPI<State> & ...userPluginAPIs
```

### Path Finding

LCA (Lowest Common Ancestor) algorithm for traversal between any two nodes.

```typescript
interface TraversalPath {
  ancestor: NodeId        // LCA node
  undoPath: NodeId[]      // nodes to undo, from current toward ancestor (not including ancestor)
  redoPath: NodeId[]      // nodes to redo, from ancestor toward target (not including ancestor)
}
```

Algorithm (O(depth) time and space):

```
findPath(from, to):
  fromAncestors = walkUp(from)   // [from, parent, ..., root]
  toAncestors = walkUp(to)       // [to, parent, ..., root]

  toSet = Set(toAncestors)
  ancestor = first node in fromAncestors that is in toSet

  undoPath = fromAncestors up to (not including) ancestor
  redoPath = toAncestors up to (not including) ancestor, reversed

  return { ancestor, undoPath, redoPath }
```

### Error Handling

**Throws:**

| Situation | Reason |
|-----------|--------|
| `getNode(invalidId)` | Node doesn't exist — programmer error |
| `to(invalidId)` | Node doesn't exist — programmer error |
| `apply()` recipe throws | Propagate error, don't create node, don't change state |
| Plugin missing dependency at `.use()` | Fail fast at registration time |
| `import()` with invalid data | Corrupted input |

**No-op (silently succeeds):**

| Situation | Reason |
|-----------|--------|
| `undo()` at root | Not an error. `canUndo()` exists for checking. |
| `redo()` at leaf | Not an error. `canRedo()` exists for checking. |
| `to(currentId)` | Already there. No events fired. |
| Hook returns `false` | Plugin's decision to cancel, not an error. |

**Action tracker effect failure:**
- State already committed (no rollback)
- Promise rejects — caller can catch
- `effect:error` event fires
- Traversal stops at the failed step

## Plugin System

### Plugin Definition

```typescript
interface PluginDef<
  State,
  Requires extends Record<string, any>,
  Provides extends Record<string, any>,
> {
  name: string
  dependencies?: string[]          // runtime check
  hooks?: PluginHooks<State>       // lifecycle hooks
  setup(core: TrrackCore<State>, api: Requires): Provides
}
```

### Lifecycle Hooks

Hooks map to kernel events. Difference: events are for listeners, hooks can modify behavior (cancel, inject data).

```typescript
interface RecordContext<State> {
  event: EventData
  patches: Patch[]
  newState: State
  previousState: State
  parentId: NodeId
  ext: Record<string, unknown>   // plugins write here to inject data into the new node
}

interface NavigateContext {
  from: NodeId
  to: NodeId
  path: NodeId[]
  direction: 'undo' | 'redo' | 'jump'
}

interface PluginHooks<State> {
  beforeRecord?(ctx: RecordContext<State>): void | false   // can cancel, can mutate ctx.ext
  afterRecord?(node: ProvenanceNode<State>): void
  beforeNavigate?(ctx: NavigateContext): void | false       // can cancel
  afterNavigate?(ctx: NavigateContext): void
  serialize?(ext: Record<string, unknown>): Record<string, unknown>
  deserialize?(ext: Record<string, unknown>): Record<string, unknown>
  destroy?(): void
}
```

### Builder

```typescript
function createTrrack<State>(config: {
  initialState: State
  checkpoint?: CheckpointStrategy<State>
  generateId?: () => string
}): TrrackBuilder<State, {}>

interface TrrackBuilder<State, API extends Record<string, any>> {
  use<Req extends Record<string, any>, Prov extends Record<string, any>>(
    plugin: PluginDef<State, Req, Prov>
  ): TrrackBuilder<State, API & Prov>

  build(): Trrack<State> & API
}
```

`build()` returns `Trrack<State>` (kernel public API) merged with all plugin APIs. Core plugin methods (navigation, reactivity, serialization) are merged in automatically before user plugin methods.

### Plugin Ordering

- Core plugins run their hooks before user plugins
- User plugins run in registration order (`.use()` call order)

## Core Plugins

Implemented as plugins internally (dogfooding the plugin system), but auto-included. Users see them as part of the core API.

### Navigation

```typescript
Provides: {
  undo(): Promise<void>
  redo(pick?: 'latest' | 'oldest'): Promise<void>
  canUndo(): boolean
  canRedo(): boolean
  to(id: NodeId): Promise<void>
}
```

Returns `Promise<void>` always for forward-compatibility with action tracker's async effects. Resolves immediately when no effects are involved.

Uses LCA-based path finding for `to()`. `redo` with multiple children (branching) uses `pick` parameter — `'latest'` follows most recently created child (default), `'oldest'` follows first child.

**Edge cases:**

- `undo()` at root: no-op. `canUndo()` returns `false`.
- `redo()` at leaf: no-op. `canRedo()` returns `false`.
- `to(currentId)`: no-op. No events fired.
- `to(ancestorId)`: pure undo path. Direction = `'undo'`.
- `to(descendantId)`: pure redo path. Direction = `'redo'`.
- `to(id)` across branches: undo to LCA, then redo down. Direction = `'jump'`.

**Branching**: undo then `apply()` creates a new child of the current node. Old branch is preserved in the DAG, never deleted. Children ordered by `createdAt`.

### Reactivity

```typescript
Provides: {
  subscribe(listener: (state: State, ctx: { type: 'record' | 'navigate'; node: ProvenanceNode<State> }) => void): () => void
  effect<T>(
    selector: (state: State) => T,
    callback: (value: T, prev: T) => void,
    eq?: (a: T, b: T) => boolean   // default: Object.is
  ): () => void
}
```

**State-change only.** Relies entirely on Mutative's structural sharing — no caching, no deep equality.

How it works internally:
- Kernel tracks `currentState` variable (see Current State section)
- On `apply()`: `produce()` returns new ref if mutations happened, same ref if no mutations
- On navigate: `resolveState()` via `applyPatches` from checkpoint, structural sharing with checkpoint
- `subscribe`: fires when `prevState !== currentState` (reference comparison)
- `effect`: fires when `!eq(selector(prevState), selector(currentState))`, default `eq` is `Object.is`

Scenarios:

| Scenario | Top-level ref | Selector refs | subscribe | effect |
|----------|--------------|---------------|-----------|--------|
| `apply()` with mutations | New | Changed parts new, rest same | Fires | Fires if selected part changed |
| Effect-only action | Same (produce returns same ref) | Same | Doesn't fire | Doesn't fire |
| Navigate to different state | New (applyPatches) | Structural sharing with checkpoint | Fires | Fires if selected part changed |

**Raw events vs reactivity:**
- Raw events (`core.on(...)`) = plugin API, accessible in plugin `setup()` only
- Reactivity (`subscribe`, `effect`) = end user API, state-change driven

### Serialization

```typescript
Provides: {
  export(): string
  import(json: string): void
  exportObject(): SerializedGraph<State>
  importObject(graph: SerializedGraph<State>): void
}
```

Serializes entire graph including all `ext` bags. Calls plugin `serialize`/`deserialize` hooks for plugins with non-JSON data.

### Action Tracker (core, added later)

Layers on top of kernel's `apply()`. Provides named, typed actions with optional async side effects.

```typescript
Provides: {
  register<Name extends string, Args extends any[]>(
    name: Name,
    config: {
      do?:   (draft: Draft<State>, ...args: Args) => void
      undo?: (draft: Draft<State>, ...args: Args) => void
      effects?: {
        do?:   (...args: Args) => void | Promise<void>
        undo?: (...args: Args) => void | Promise<void>
      }
    }
  ): Action<Name, Args>

  dispatch<Args extends any[]>(
    event: string | EventData,
    action: Action<string, Args>,
    ...args: Args
  ): Promise<void>
}
```

Rules:
- At least one of `do`/`undo` (state recipes) or `effects` is required
- `dispatch()` calls kernel `apply()` with the `do` recipe (or identity if effect-only), then awaits effects
- Action metadata (name, args) stored in `node.ext['action-tracker']`
- Navigation awaits effects during traversal (sequential, each step completes before next)
- Effect failure: state already committed, promise rejects, traversal stops, `effect:error` event fires

**apply() vs dispatch():**

| | `apply()` | `dispatch()` |
|---|---|---|
| Where | Kernel | Action tracker |
| State change | Required | Optional |
| Side effects | No | Optional (async) |
| Named/typed args | No | Yes |
| Stored in ext | Nothing | Action name + args |

## User Plugins

### Metadata

Annotations, bookmarks, custom key-value metadata per node. Stored in `node.ext['metadata']`.

### Ephemeral Nodes

Temporary nodes that get replaced (not branched) on next `apply`. Uses `beforeRecord` hook to detect and replace ephemeral current node. Marks nodes via `node.ext['ephemeral']`.

### Graph Queries

Tree representation, ancestors, descendants, path utilities. Useful for visualization. Not auto-included — vis packages require it.

## Usage

```typescript
import { createTrrack, metadata, ephemeral } from '@trrack/core'

interface AppState { count: number; items: string[] }

// Core plugins (navigation, reactivity, serialization) are auto-included
const t = createTrrack<AppState>({
  initialState: { count: 0, items: [] },
  checkpoint: { maxChainLength: 10 },
})
  .use(metadata())
  .use(ephemeral())
  .build()

// Kernel API — simple string label
t.apply('Add item', draft => { draft.items.push('hello') })

// Kernel API — structured event for analysis
t.apply(
  { label: 'Applied filter', type: 'filter.apply', category: 'data', tags: ['user-study'] },
  draft => { draft.filter = 'active' }
)

const state = t.getState()

// Navigation (core plugin)
await t.undo()
await t.redo()
t.canUndo()  // boolean

// Reactivity (core plugin)
t.subscribe((state, ctx) => console.log(ctx.type, state))
t.effect(s => s.count, (val, prev) => console.log(prev, '->', val))

// Serialization (core plugin)
const json = t.export()
t.import(json)

// Metadata (user plugin)
t.annotate('User clicked the button')
t.bookmark()

// Ephemeral (user plugin)
t.applyEphemeral('Preview', draft => { draft.count = 99 })
```

## Immutability & Serialization Integrity

Provenance graphs are **immutable records**. No pruning, no deletion, no garbage collection. Once a node exists, it exists forever.

**Plugin versioning**: Plugins declare a `version` string (semver, matching their npm package version).

```typescript
interface PluginDef<State, Requires, Provides> {
  name: string
  version: string                // semver from package.json
  dependencies?: string[]
  hooks?: PluginHooks<State>
  setup(core: TrrackCore<State>, api: Requires): Provides
}
```

**On export**, serialization stores a manifest in `graph.ext['_manifest']`:

```typescript
{
  trrack: '2.0.0',              // core version
  plugins: {
    metadata: '1.2.3',
    ephemeral: '0.3.1'
  }
}
```

**On import**, compare manifest against current environment (major version only):

| Situation | Action |
|-----------|--------|
| Same plugin, same major | Load normally |
| Same plugin, different major | Warn and continue |
| Plugin in manifest but not loaded | Warn and continue (ext data preserved but inaccessible) |
| Plugin loaded but not in manifest | Fine, no warning |
| Different trrack core major | Warn and continue |

Warnings via `console.warn`. **Never throws on mismatch. The graph always loads.**

## Dependencies

- **mutative** — Structural sharing, `produce`, `produceWithPatches`, `applyPatches`. Drop-in Immer alternative, ~10x faster. Same API shape (`Draft<T>`, `Patch`, etc.).

## Future Plugin Ideas

Documented for later. Not part of v2 initial implementation.

- **URL State Sharing** — Encode current node/state in URL params for instant sharing. Signature feature of v1. Updates URL on navigation, restores state from URL on load.
- **Duration Tracking** — Track how long each state was active (`activeDuration`). Uses `afterNavigate`/`afterRecord` hooks to measure time between transitions. Useful for user study analytics.
- **Persistence Backends** — localStorage, IndexedDB, server API, Firebase. Build on top of serialization plugin. Auto-save on changes, restore on load.
- **Read-only / Replay Mode** — Lock a trrack instance so `apply()` is disabled, only navigation works. Useful for replaying exported sessions. Can be a plugin that uses `beforeRecord` hook to block recording.
- **Framework Adapters** — `@trrack/react` (hooks), `@trrack/vue` (composables), `@trrack/svelte` (stores). Thin wrappers around reactivity plugin.
