# Trrack v1 Reference (`@trrack/core@1.3.0`)

Complete analysis of v1 behavior and API for reference during v2 development.

## Overview

Trrack (**r**eproducible **track**ing) is a TypeScript library for action-based provenance tracking in web applications. It maintains a **DAG of application states**, enabling undo/redo, time-travel debugging, and full audit trails.

**Dependencies:** `@reduxjs/toolkit@^1.9.1`, `fast-json-patch@^3.1.1`, `uuid@^9.0.0`, Immer (via RTK)

**Source:** ~1208 lines across 17 files in `packages/core/src/`

---

## Public API Surface

### 1. Initialization

```typescript
import { initializeTrrack, Registry } from '@trrack/core';

const registry = Registry.create<EventType>();
const trrack = initializeTrrack({ registry, initialState });
```

**`initializeTrrack<State, Event>(options)`**
- `options.registry: Registry<Event>` — registered action handlers
- `options.initialState: State` — initial application state
- Returns: `Trrack<State, Event>` instance

### 2. Action Registration

```typescript
const registry = Registry.create<'add' | 'subtract'>();
```

**Two action types based on function arity:**

**Pure state changes (2 params — state, payload):**
```typescript
const add = registry.register('add', (state, amt: number) => {
    state.counter += amt;  // Immer-wrapped
}, { eventType: 'add', label: (amt) => `Added ${amt}` });
```

**Side-effect actions (1 param — payload, returns do/undo):**
```typescript
const fetchData = registry.register('fetch', (id: string) => ({
    do: fetchAction(id),
    undo: revertAction()
}), { eventType: 'async', label: 'Fetch data' });
```

`register()` returns a Redux Toolkit `PayloadAction` creator.

### 3. Trrack Instance API

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `registry` | `Registry<Event>` | Action registry reference |
| `isTraversing` | `boolean` (getter) | True during traversal |
| `current` | `ProvenanceNode<State, Event>` (getter) | Current node |
| `root` | `RootNode<State>` (getter) | Root node |
| `graph` | `ProvenanceGraphStore` (getter) | Underlying graph store |

#### Core Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getState` | `(node?) => State` | Get state at node (or current) |
| `apply` | `(label: string, action: PayloadAction) => void` | Execute registered action |
| `to` | `(nodeId: NodeId) => Promise<void>` | Traverse to specific node |
| `undo` | `() => Promise<void>` | Go to parent node |
| `redo` | `(to?: 'latest' \| 'oldest') => Promise<void>` | Go to child node |
| `record` | `(args: RecordActionArgs) => void` | Manually record a state change |
| `tree` | `() => TreeNode` | Get tree representation |
| `done` | `() => void` | Placeholder for URL sharing |

#### Event Listeners

| Method | Signature | Description |
|--------|-----------|-------------|
| `on` | `(event: TrrackEvents, listener) => void` | Listen to traversal events |
| `currentChange` | `(listener, skipOnNew?) => unsubscribe` | Listen to current node changes |

**TrrackEvents:** `TRAVERSAL_START`, `TRAVERSAL_END`
**currentChange trigger:** `'new'` (action applied) or `'traversal'` (navigation)

#### Import/Export

| Method | Signature | Description |
|--------|-----------|-------------|
| `export` | `() => string` | Serialize graph to JSON string |
| `exportObject` | `() => ProvenanceGraph` | Export as JS object |
| `import` | `(jsonString: string) => void` | Load graph from string |
| `importObject` | `(graph: ProvenanceGraph) => void` | Load graph from object |

#### Metadata API (`trrack.metadata.*`)

| Method | Signature |
|--------|-----------|
| `add` | `(record: Record<string, unknown>, node?) => void` |
| `latestOfType<T>` | `(type: string, node?) => Metadata<T> \| undefined` |
| `allOfType<T>` | `(type: string, node?) => Metadata<T>[] \| undefined` |
| `latest` | `(node?) => Record<string, Metadata> \| undefined` |
| `all` | `(node?) => Record<string, Metadata[]> \| undefined` |
| `types` | `(node?) => string[]` |

#### Annotations API (`trrack.annotations.*`)

| Method | Signature |
|--------|-----------|
| `add` | `(annotation: string, node?) => void` |
| `latest` | `(node?) => string \| undefined` |
| `all` | `(node?) => string[] \| undefined` |

#### Bookmarks API (`trrack.bookmarks.*`)

| Method | Signature |
|--------|-----------|
| `add` | `(node?) => void` |
| `remove` | `(node?) => void` |
| `is` | `(node?) => boolean` |
| `toggle` | `(node?) => void` |

#### Artifacts API (`trrack.artifact.*`)

| Method | Signature |
|--------|-----------|
| `add<A>` | `(artifact: A, node?) => void` |
| `latest` | `(node?) => Artifact \| undefined` |
| `all` | `(node?) => Artifact[] \| undefined` |

---

## Data Model

### Graph Structure

```typescript
type ProvenanceGraph<State, Event> = {
    nodes: Record<NodeId, ProvenanceNode<State, Event>>;
    current: NodeId;
    root: NodeId;
};
```

Stored in Redux via `configureStore`. Nodes linked by `parent`/`children` references (no separate edge storage).

### Node Types

```typescript
type NodeId = FlavoredId<string, 'Node'>;  // Branded string (UUID)

type ProvenanceNode<State, Event> = RootNode<State> | StateNode<State, Event>;

type RootNode<State> = {
    id: NodeId;
    label: string;
    level: 0;
    event: 'Root';
    children: NodeId[];
    state: StateLike<State>;  // Always checkpoint
    artifacts: Artifact[];
    meta: NodeMetadata;
    createdOn: number;
};

type StateNode<State, Event> = {
    id: NodeId;
    label: string;
    level: number;
    event: Event;
    parent: NodeId;
    children: NodeId[];
    state: StateLike<State>;
    sideEffects: SideEffects;
    artifacts: Artifact[];
    meta: NodeMetadata;
    createdOn: number;
};
```

### State Storage (Hybrid Checkpoint + Patch)

```typescript
type StateLike<State> =
    | { type: 'checkpoint'; val: State }
    | { type: 'patch'; checkpointRef: NodeId; val: Operation[] };
```

**Strategy:** If patches touch <50% of object keys → save as patch; otherwise → checkpoint.

**Reconstruction:** Walk from node up to its `checkpointRef`, collect all patches along path, apply to checkpoint state using `fast-json-patch`.

### Side Effects

```typescript
type SideEffects = {
    do: PayloadAction[];   // Execute when moving forward
    undo: PayloadAction[]; // Execute when moving backward
};
```

### Metadata & Artifacts

```typescript
type Metadata<T = unknown> = {
    id: MetadataId;
    type: string;
    createdOn: number;
    val: T;
};

type NodeMetadata = {
    annotation: Metadata<string>[];
    bookmark: Metadata<boolean>[];
    [key: string]: Metadata<unknown>[];
};

type Artifact = {
    id: ArtifactId;
    createdOn: number;
    val: unknown;
};
```

---

## Core Algorithms

### Traversal (`to()`)

1. Fire `TRAVERSAL_START`
2. Find path via LCA (Lowest Common Ancestor) algorithm
3. For each edge in path:
   - Moving up (undo): collect `currentNode.sideEffects.undo`
   - Moving down (redo): collect `nextNode.sideEffects.do`
4. Execute all collected side effects sequentially (async)
5. Update `current` pointer in graph
6. Fire `TRAVERSAL_END`

### LCA Path Finding

1. Equalize node depths (advance deeper node toward root)
2. Walk both nodes up simultaneously until they meet
3. Build path: current → LCA → destination

### State Save Strategy

```
patches = compare(oldState, newState)
uniquePaths = new Set(patches.map(p => p.path))
if (uniquePaths.size < Object.keys(newState).length * 0.5)
    → save as patch (with checkpointRef)
else
    → save as checkpoint
```

### Action Application (`apply()`)

1. Get current state via `getState()`
2. If side-effect action (1-param func): call func, get `{do, undo}`, record with original state
3. If state-change action (2-param func): call Immer-wrapped func, record with new state
4. `record()` computes patches, picks save strategy, creates node, adds to graph

---

## Redux Integration (`@trrack/redux`)

Separate package wrapping `@trrack/core` for Redux stores:

```typescript
const slice = createTrrackableSlice({
    name: 'counter',
    initialState: { value: 0 },
    reducers: { increment(state) { state.value++; } },
    labels: { increment: 'Increment' },
    doUndoActionCreators: {
        increment({ previousState }) {
            return { undo: decrement() };
        }
    }
});

const { store, trrack } = configureTrrackableStore({
    reducer: { counter: slice.reducer },
    slices: [slice]
});
```

---

## Internal Architecture

### File Structure

```
packages/core/src/
├── index.ts                      (8 lines)  — Re-exports
├── event/index.ts               (26 lines)  — Simple pub/sub event manager
├── graph/
│   ├── index.ts                  (2 lines)  — Re-exports
│   ├── components/
│   │   ├── index.ts              (1 line)   — Re-exports
│   │   └── node.ts             (224 lines)  — Node types, creation, type guards
│   ├── graph-slice.ts          (108 lines)  — Redux slice for graph state
│   └── provenance-graph.ts      (93 lines)  — Store setup, listener middleware
├── provenance/
│   ├── index.ts                  (4 lines)  — Re-exports
│   ├── trrack-config-opts.ts     (6 lines)  — Config types
│   ├── trrack-events.ts          (4 lines)  — Event enum
│   ├── trrack.ts               (491 lines)  — Core implementation (traversal, state, apply)
│   └── types.ts                 (81 lines)  — Trrack interface definition
├── registry/
│   ├── index.ts                  (2 lines)  — Re-exports
│   ├── action.ts                (39 lines)  — Action type definitions
│   └── reg.ts                   (91 lines)  — Registry class
└── utils/
    ├── index.ts                  (1 line)   — Re-exports
    └── id.ts                    (27 lines)  — Flavored ID types, UUID generator
```

### Key Dependencies & Their Roles

- **@reduxjs/toolkit** — Graph state store, action creators, Immer integration, listener middleware
- **fast-json-patch** — `compare()` for diffing states, `applyPatch()` for reconstruction
- **uuid** — Node/metadata/artifact ID generation
- **immer** (via RTK) — Wraps state-change functions for safe mutation-style updates

### Exported Symbols

```typescript
export {
    // Factory
    initializeTrrack,
    // Registry
    Registry, createAction,
    // Types
    Trrack, ProvenanceNode, ProvenanceGraph, NodeId, Artifact, Metadata,
    // Utilities
    isStateNode, isRootNode,
    // Events
    TrrackEvents,
    // Graph (low-level)
    initializeProvenanceGraph, createStateNode, createRootNode
};
```

---

## Typical Usage Pattern

```typescript
import { initializeTrrack, Registry } from '@trrack/core';

// 1. Create registry
const registry = Registry.create<'counter'>();

const add = registry.register('add', (state, amt: number) => {
    state.counter += amt;
}, { eventType: 'counter', label: (amt) => `Add ${amt}` });

// 2. Initialize
const trrack = initializeTrrack({
    registry,
    initialState: { counter: 0 }
});

// 3. Apply actions
trrack.apply('Add 5', add(5));
trrack.getState(); // { counter: 5 }

// 4. Navigate
await trrack.undo();   // { counter: 0 }
await trrack.redo();   // { counter: 5 }

// 5. Annotate
trrack.annotations.add('Important state');
trrack.bookmarks.add();

// 6. Persist
const saved = trrack.export();
trrack.import(saved);
```
