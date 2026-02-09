# Trrack v2 Design

This document captures architectural decisions and design patterns for Trrack v2.

## Architecture Overview

Trrack v2 uses an **enhancer pattern** with a **builder API** to provide extensibility while maintaining type safety.

### Goals

- **Minimal core** - Only fundamental provenance tracking in base
- **Composable** - Features added via enhancers
- **Tree-shakeable** - Users only bundle what they use
- **Type-safe** - Full TypeScript inference through the chain
- **Extensible** - Third parties can write enhancers

### Pattern Choice

We chose the **builder pattern** over an array-based approach because:

1. **Natural type narrowing** - Each `.with()` call knows the current shape
2. **Explicit ordering** - Enhancer order matters; builder makes this visible
3. **Dependency enforcement** - TypeScript can verify dependencies at each step
4. **Better DX** - IDE autocomplete shows available enhancers based on current state

## Types

### Event Data

```typescript
interface EventData {
  label: string;
  payload?: unknown;  // typed via withRegistry() enhancer
}
```

### State Storage

Nodes store state as either a full checkpoint or incremental patches (Immer format):

```typescript
import type { Patch } from 'immer';

type StateStorage<State> =
  | { type: 'checkpoint'; value: State }
  | { type: 'patch'; patches: Patch[]; inversePatches: Patch[]; checkpointRef: string };
```

- **checkpoint**: Full state snapshot
- **patch**: Immer patches + inverse patches (for undo) + reference to nearest checkpoint ancestor

### Node Types

```typescript
interface ProvenanceNodeBase<State> {
  id: string;                    // nanoid
  createdAt: number;             // timestamp
  children: string[];            // child node IDs (for branching)
  state: StateStorage<State>;
}

// Root node - always checkpoint, no parent
interface RootNode<State> extends ProvenanceNodeBase<State> {
  type: 'root';
  state: { type: 'checkpoint'; value: State };  // narrowed: always checkpoint
}

// State node - has parent and event
interface StateNode<State> extends ProvenanceNodeBase<State> {
  type: 'state';
  parent: string;                // parent node ID
  event: EventData;
}

type ProvenanceNode<State> = RootNode<State> | StateNode<State>;
```

### Graph Structure

```typescript
interface ProvenanceGraph<State> {
  nodes: Map<string, ProvenanceNode<State>>;
  root: string;      // root node ID
  current: string;   // current node ID
}
```

## Configuration

```typescript
interface CheckpointConfig {
  /** Max nodes since last checkpoint before forcing new one. Default: 10 */
  maxChainLength?: number;

  /** Max patch operations before forcing checkpoint. Default: 20 */
  maxPatchCount?: number;

  /** Max ratio of patch size to state size. Default: 0.5 */
  maxPatchRatio?: number;
}

interface CheckpointContext<State> {
  patches: Patch[];
  inversePatches: Patch[];
  currentState: State;
  newState: State;
  chainLength: number;
  config: Required<CheckpointConfig>;  // resolved defaults
}

/** Config object for thresholds, or custom function for full control */
type CheckpointStrategy<State> =
  | CheckpointConfig
  | ((context: CheckpointContext<State>) => boolean);

interface TrrackConfig<State> {
  /** Initial application state */
  initialState: State;

  /** Checkpoint strategy - config object or custom function */
  checkpoint?: CheckpointStrategy<State>;
}
```

### Custom Checkpoint Logic

```typescript
import { defaultShouldCheckpoint } from '@trrack/core';

// Override thresholds
createTrrack({
  initialState,
  checkpoint: { maxChainLength: 20 },
});

// Fully custom logic
createTrrack({
  initialState,
  checkpoint: (ctx) => {
    // Always checkpoint if user object changes
    if (ctx.patches.some(p => p.path[0] === 'user')) return true;
    // Otherwise use default logic
    return defaultShouldCheckpoint(ctx);
  },
});
```

## State Storage Strategy

State is stored automatically as either checkpoints (full snapshots) or patches (incremental changes).

### Patch Format

We use **Immer patches** internally (not JSON Patch RFC 6902):

```typescript
// Immer patch format
{ op: 'replace', path: ['user', 'name'], value: 'Alice' }

// vs JSON Patch (RFC 6902)
{ op: 'replace', path: '/user/name', value: 'Alice' }
```

**Rationale:**
- Immer is already a dependency
- `produceWithPatches()` gives patches + inverse patches for free
- Inverse patches enable undo without recomputing
- Convert to RFC 6902 in `withPersistence()` for interoperability

### Checkpoint Decision Logic

Hybrid approach with configurable thresholds:

```typescript
interface CheckpointConfig {
  maxChainLength?: number;   // default: 10
  maxPatchCount?: number;    // default: 20
  maxPatchRatio?: number;    // default: 0.5
}

function shouldCheckpoint(
  patches: Patch[],
  state: State,
  chainLength: number,
  config: CheckpointConfig
): boolean {
  // Force checkpoint if chain too long (bounds resolution time)
  if (chainLength >= config.maxChainLength) return true;

  // Force checkpoint if too many operations
  if (patches.length > config.maxPatchCount) return true;

  // Compare sizes: large changes → checkpoint
  const patchSize = estimateSize(patches);
  const stateSize = estimateSize(state);
  return patchSize > stateSize * config.maxPatchRatio;
}
```

**Defaults:**
| Config | Default | Rationale |
|--------|---------|-----------|
| `maxChainLength` | 10 | Bounds worst-case resolution to 10 patch applications |
| `maxPatchCount` | 20 | Many small changes → just snapshot |
| `maxPatchRatio` | 0.5 | If patches > 50% of state size, snapshot is cheaper |

**Configuration:**
```typescript
createTrrack({
  initialState,
  checkpoint: {
    maxChainLength: 20,  // override for deep histories
  }
})
```

### State Resolution

```typescript
function resolveState<State>(
  node: ProvenanceNode<State>,
  graph: ProvenanceGraph<State>
): State {
  if (node.state.type === 'checkpoint') {
    return node.state.value;
  }

  // Walk back to checkpoint, collect patches
  const checkpointNode = graph.nodes.get(node.state.checkpointRef);
  const patches = collectPatchesFromCheckpoint(checkpointNode, node, graph);

  // Apply all patches to checkpoint state
  return applyPatches(checkpointNode.state.value, patches);
}
```

Users never deal with this - `trrack.state()` and `trrack.getState(nodeId)` always return resolved state.

## Core (Internal)

`TrrackCore` is the **internal** foundation that enhancers build upon. Users never interact with it directly - they always receive a Trrack instance with default enhancers (navigation, reactivity) already applied.

```typescript
interface TrrackCore<State> {
  // Read access via methods (allows simple spread in enhancers)
  state(): State;
  current(): ProvenanceNode<State>;
  root(): RootNode<State>;

  // Mutations
  record(newState: State, event: EventData): void;
  setCurrent(nodeId: string): void;

  // State resolution for any node
  getState(nodeId: string): State;

  // For enhancers (internal)
  _graph(): ProvenanceGraph<State>;
  _enhancers(): Set<string>;
}
```

> **Why methods instead of getters?** The spread operator (`...obj`) converts getters to static values at spread time. Since enhancers use spread to compose objects, getters would break reactivity. Methods work correctly with spread.
```

### What's in TrrackCore

| Feature | Rationale |
|---------|-----------|
| `state()` | Fundamental - current application state |
| `current()` | Fundamental - current node reference |
| `root()` | Fundamental - root node reference |
| `record()` | Low-level node creation |
| `setCurrent()` | Low-level pointer movement |
| `getState()` | Resolve state for any node |
| `_graph()` | Internal graph for enhancers to access |
| `_enhancers()` | Runtime enhancer tracking |

### What's Built via Enhancers

| Feature | Enhancer | Notes |
|---------|----------|-------|
| `undo()`, `redo()` | `navigation()` | **Default** - always included |
| `canUndo()`, `canRedo()` | `navigation()` | **Default** - always included |
| `subscribe()` | `reactivity()` | **Default** - always included |
| Action registry | `registry()` | Optional (planned) |
| Metadata/bookmarks | `metadata()` | Optional (planned) |
| Import/export | `persistence()` | Optional (planned) |
| Side effects | `sideEffects()` | Optional (planned) |

## Enhancer System

### Enhancer Definition

```typescript
type EnhancerFn<In, Out> = (trrack: In) => Out;

interface Enhancer<In, Out, Deps extends string[] = []> {
  name: string;
  dependencies: Deps;
  enhance: EnhancerFn<In, Out>;
}

function defineEnhancer<In, Out, Deps extends string[] = []>(config: {
  name: string;
  dependencies?: Deps;
  enhance: EnhancerFn<In, Out>;
}): Enhancer<In, Out, Deps>;
```

### Dependency Mechanism

Enhancers can depend on other enhancers. Dependencies are enforced at **both** levels:

**Type-level (compile time):**
```typescript
// persistence requires MetadataAPI in its input type
const persistence = () => defineEnhancer<
  TrrackCore<any> & MetadataAPI,  // Input must have metadata
  PersistenceAPI,
  ['metadata']
>({ ... });
```

**Runtime (for JS users and edge cases):**
```typescript
function persistence() {
  return defineEnhancer({
    name: 'persistence',
    dependencies: ['metadata'],
    enhance: (trrack) => {
      // Runtime check handled by builder
      // ...
    },
  });
}
```

### Enhancer Ordering

**Order matters!** Enhancers that wrap methods must be applied before enhancers that call those methods.

**Rule: "Wrappers before callers"**

```typescript
// reactivity wraps setCurrent/record to notify listeners
// navigation calls setCurrent via undo/redo
// Therefore: reactivity must come before navigation

createTrrack({ initialState })
  .with(reactivity())  // Wraps setCurrent
  .with(navigation())    // Calls setCurrent (gets wrapped version)
  .build();
```

This is similar to Redux middleware ordering - the order in which enhancers see method calls matters.
```

### Builder API

```typescript
interface TrrackBuilder<State, CurrentAPI, ActiveEnhancers extends string[]> {
  with<NewAPI, Deps extends string[]>(
    enhancer: Enhancer<CurrentAPI, NewAPI, Deps>
  ): /* Type error if Deps not satisfied, else extended builder */;

  withIf<NewAPI, Deps extends string[]>(
    condition: boolean,
    enhancer: Enhancer<CurrentAPI, NewAPI, Deps>
  ): /* Conditional enhancement */;

  build(): CurrentAPI;
}

function createTrrack<State>(config: TrrackConfig<State>): TrrackBuilder<State, DefaultTrrack<State>, ['navigation', 'reactivity']>;
```

### Default Enhancers (Always Applied)

Default enhancers are **always** included. Users get a batteries-included experience:

```typescript
// Default enhancers are applied automatically
createTrrack({ initialState })
  // Internally: .with(reactivity()).with(navigation())
  .build();

// Result always has:
// - undo(), redo(), canUndo(), canRedo() (from navigation)
// - subscribe() (from reactivity)
```

The `TrrackCore` type is internal - users work with `Trrack` which includes defaults:

```typescript
type Trrack<State> = TrrackCore<State> & NavigationAPI & ReactivityAPI<State>;
```

### State Extension Rules

Enhancers can **extend** internal state but cannot **remove** existing state:

- Adding new properties: ✅ Allowed
- Removing properties: ❌ Forbidden (breaks other enhancers)
- For "removal" use cases: Use read-time filtering or transformation utilities

## Enhancers

### Implemented

| Enhancer | Provides | Dependencies | Status |
|----------|----------|--------------|--------|
| `reactivity()` | `subscribe(listener)`, `effect(selector, callback, equalityFn?)` | - | ✅ Default |
| `navigation()` | `undo()`, `redo()`, `canUndo()`, `canRedo()` | - | ✅ Default |

### Planned

| Enhancer | Provides | Dependencies |
|----------|----------|--------------|
| `registry()` | `register()`, `apply()`, typed actions | - |
| `metadata()` | `metadata`, `artifacts`, `bookmarks` | - |
| `persistence()` | `export()`, `import()`, RFC 6902 conversion | `metadata` |
| `sideEffects()` | Side-effect action support | `navigation` |
| `devTools()` | Browser devtools integration | `reactivity` |
| `collaboration()` | Real-time multi-user sync | `persistence` |

Note: Patch-based state storage is built into core, not an enhancer.

## Reactivity & Effects

The `reactivity()` enhancer provides two ways to react to state changes:

### subscribe()

Simple reactivity that fires on every state change:

```typescript
const unsubscribe = trrack.subscribe((state) => {
  console.log('State changed:', state);
});
```

### effect()

Selector-based reactivity that only fires when the selected value changes:

```typescript
import { compare } from '@trrack/core';

// Only fires when user.name changes
trrack.effect(
  (state) => state.user.name,           // selector
  (name) => console.log('Name:', name), // callback
);

// With custom equality for objects
trrack.effect(
  (state) => state.user,
  (user) => render(user),
  compare.shallow,  // shallow equality comparison
);

// Skip immediate execution
trrack.effect(
  (state) => state.count,
  (count) => console.log(count),
  compare.strict,
  { runImmediately: false },
);
```

**How it works:**
- Selector runs on every state change
- Compares result with previous value using equality function
- Only calls callback if values differ
- Immer's structural sharing means unchanged slices keep same reference

### Comparison Strategies

The `compare` namespace provides equality functions:

| Strategy | Description |
|----------|-------------|
| `compare.strict` | Strict equality (`===`). Default. |
| `compare.shallow` | Shallow comparison of object/array properties |

Custom equality functions can also be provided:

```typescript
trrack.effect(
  (state) => state.items,
  (items) => render(items),
  (prev, next) => prev.length === next.length,  // custom
);
```

### Implementation Note

`subscribe()` is implemented using `effect()` internally:

```typescript
function subscribe(listener) {
  return effect(
    (state) => state,
    listener,
    () => false,  // never equal, always fire
    { runImmediately: false },
  );
}
```

## Usage Examples

### Basic

```typescript
const trrack = createTrrack({
  initialState: { count: 0 },
  enablePatches: false,  // or true for patch storage
}).build();

// Always includes navigation + reactivity
trrack.record({ count: 1 }, { label: 'increment' });
trrack.undo();
trrack.redo();

// Methods, not getters
console.log(trrack.state());      // { count: 1 }
console.log(trrack.canUndo());    // true

// Subscribe to changes
trrack.subscribe((state) => console.log(state));
```

### With Custom Checkpoint Config

```typescript
const trrack = createTrrack({
  initialState: { count: 0 },
  enablePatches: true,
  checkpoint: { maxChainLength: 20 },
}).build();
```

### With Additional Enhancers

```typescript
const trrack = createTrrack({ initialState: { count: 0 } })
  .with(metadata())
  .with(persistence())  // OK: metadata is present
  .build();

trrack.metadata.add('bookmark', { label: 'checkpoint' });
const saved = trrack.export();
```

### Dependency Error

```typescript
// ❌ Runtime error: persistence requires metadata
const trrack = createTrrack({ initialState })
  .with(persistence())  // Error!
  .build();

// ✅ Correct order
const trrack = createTrrack({ initialState })
  .with(metadata())
  .with(persistence())
  .build();
```

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-01-30 | Use enhancer pattern for extensibility | Tree-shakeable, composable, third-party extensible |
| 2025-01-30 | Builder API over array-based | Better type inference, explicit ordering, dependency enforcement |
| 2025-01-30 | Both type + runtime dependency checks | Types catch most issues, runtime catches edge cases (JS users, dynamic lists) |
| 2025-01-30 | Enhancers can extend but not remove state | Removal breaks other enhancers; use read-time filtering instead |
| 2025-01-30 | Reactivity as enhancer (`withReactivity`) | Keeps core minimal, consistent plugin-oriented architecture |
| 2025-01-30 | Default enhancers always applied | Batteries-included experience; TrrackCore is internal only |
| 2025-01-30 | `unknown` payload in core, typed via registry | Core stays simple; `withRegistry()` adds type safety for those who want it |
| 2025-01-30 | Immer patches over JSON Patch (RFC 6902) | Already using Immer; inverse patches for free; convert on export for interop |
| 2025-01-30 | Hybrid checkpoint logic (chain + count + ratio) | Bounds resolution time, handles edge cases, configurable for power users |
| 2025-01-30 | Patch storage in core, not enhancer | Automatic optimization; users shouldn't think about storage strategy |
| 2025-01-30 | nanoid for node IDs | Short, fast, collision-safe |
| 2025-01-30 | Checkpoint config supports object or function | Object for simple overrides, function for full custom logic |
| 2025-01-30 | Export `defaultShouldCheckpoint` | Custom functions can defer to default logic |
| 2025-02-02 | Methods instead of getters for API | Spread operator converts getters to static values; methods work correctly |
| 2025-02-02 | Enhancer naming: `x()` not `withX()` | Avoids redundancy with `.with(x())` builder syntax |
| 2025-02-02 | Enhancer order: wrappers before callers | reactivity() wraps methods, navigation() calls them, so reactivity first |
| 2025-02-02 | Selector-based effects over signals/proxy | Explicit dependencies, works with Immer structural sharing, no proxy overhead |
| 2025-02-02 | `compare` namespace for equality functions | Extensible, discoverable via autocomplete, avoids flat export pollution |
| 2025-02-02 | `subscribe()` built on `effect()` | Unified implementation, subscribe is just effect with always-different equality |
| 2025-02-02 | Drop inverse patches from storage | Not used; undo navigates to parent and resolves forward from checkpoint; side effects will use explicit undo functions |
| 2025-02-09 | Remove `EventData` type, flatten `label` onto `StateNode` | `payload` was redundant with state storage; `EventData` wrapper unnecessary for a single field |
| 2025-02-09 | Add `meta: Record<string, unknown>` to `ProvenanceNodeBase` | Generic extension bag for enhancers (bookmarks, screenshots, annotations). Enhancers own their key, core just stores the data |

## TODO

### Node meta bag
Add `meta: Record<string, unknown>` to `ProvenanceNodeBase`. This is a generic extension slot for enhancers to attach per-node data (bookmarks, screenshots, annotations, etc.). Each enhancer owns its own key in the bag. Core stores it passively; enhancers provide typed access.

### Core hooks to replace enhancer method wrapping
Replace the "wrappers before callers" ordering requirement with a hook system in core. Instead of enhancers wrapping `apply`/`setCurrent`, core provides `_onApply(callback)` and `_onSetCurrent(callback)` hooks. Enhancers register callbacks; core calls all hooks after execution. This eliminates enhancer ordering concerns for behavior wrapping.
