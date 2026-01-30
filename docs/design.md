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

Users never deal with this - `trrack.state` and `trrack.getState(nodeId)` always return resolved state.

## Core (Internal)

`TrrackCore` is the **internal** foundation that enhancers build upon. Users never interact with it directly - they always receive a Trrack instance with default enhancers (navigation, subscription) already applied.

```typescript
interface TrrackCore<State> {
  // Read-only access (state is always resolved from patches)
  readonly state: State;
  readonly current: ProvenanceNode<State>;
  readonly root: RootNode<State>;

  // Low-level mutations
  record(newState: State, event: EventData): void;
  setCurrent(nodeId: string): void;

  // State resolution for any node
  getState(nodeId: string): State;

  // For enhancers
  readonly _graph: ProvenanceGraph<State>;
  readonly _enhancers: Set<string>;
}
```

### What's in TrrackCore

| Feature | Rationale |
|---------|-----------|
| `state` | Fundamental - current application state |
| `current` | Fundamental - current node reference |
| `root` | Fundamental - root node reference |
| `record()` | Low-level node creation |
| `setCurrent()` | Low-level pointer movement |
| `getState()` | Resolve state for any node |
| `_graph` | Internal graph for enhancers to access |
| `_enhancers` | Runtime enhancer tracking |

### What's Built via Enhancers

| Feature | Enhancer | Notes |
|---------|----------|-------|
| `undo()`, `redo()` | `withNavigation()` | **Default** - always included |
| `canUndo`, `canRedo` | `withNavigation()` | **Default** - always included |
| `subscribe()` | `withSubscription()` | **Default** - always included |
| Action registry | `withRegistry()` | Optional |
| Metadata/bookmarks | `withMetadata()` | Optional |
| Import/export | `withPersistence()` | Optional |
| Side effects | `withSideEffects()` | Optional |

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
// withPersistence requires MetadataAPI in its input type
const withPersistence = () => defineEnhancer<
  TrrackCore<any> & MetadataAPI,  // Input must have metadata
  PersistenceAPI,
  ['metadata']
>({ ... });
```

**Runtime (for JS users and edge cases):**
```typescript
function withPersistence() {
  return defineEnhancer({
    name: 'persistence',
    dependencies: ['metadata'],
    enhance: (trrack) => {
      // Runtime check
      if (!trrack._enhancers.has('metadata')) {
        throw new Error('withPersistence requires withMetadata()');
      }
      // ...
    },
  });
}
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

function createTrrack<State>(config: TrrackConfig<State>): TrrackBuilder<State, DefaultTrrack<State>, ['navigation', 'subscription']>;
```

### Default Enhancers (Always Applied)

Default enhancers are **always** included. Users get a batteries-included experience:

```typescript
// Default enhancers are applied automatically
createTrrack({ initialState })
  // Internally: .with(withNavigation()).with(withSubscription())
  .build();

// Result always has:
// - undo(), redo(), canUndo, canRedo (from withNavigation)
// - subscribe() (from withSubscription)
```

The `TrrackCore` type is internal - users work with `DefaultTrrack` which includes defaults:

```typescript
type DefaultTrrack<State> = TrrackCore<State> & NavigationAPI & SubscriptionAPI;
```

### State Extension Rules

Enhancers can **extend** internal state but cannot **remove** existing state:

- Adding new properties: ✅ Allowed
- Removing properties: ❌ Forbidden (breaks other enhancers)
- For "removal" use cases: Use read-time filtering or transformation utilities

## Planned Enhancers

| Enhancer | Provides | Dependencies |
|----------|----------|--------------|
| `withNavigation()` | `undo()`, `redo()`, `canUndo`, `canRedo` | - |
| `withSubscription()` | `subscribe(listener)` | - |
| `withRegistry()` | `register()`, `apply()`, typed actions | - |
| `withMetadata()` | `metadata`, `artifacts`, `bookmarks` | - |
| `withPersistence()` | `export()`, `import()`, RFC 6902 conversion | `metadata` |
| `withSideEffects()` | Side-effect action support | `navigation` |
| `withDevTools()` | Browser devtools integration | `subscription` |
| `withCollaboration()` | Real-time multi-user sync | `persistence` |

Note: Patch-based state storage is built into core, not an enhancer.

## Usage Examples

### Basic

```typescript
const trrack = createTrrack({ initialState: { count: 0 } })
  .build();

// Always includes navigation + subscription
trrack.undo();
trrack.redo();
trrack.subscribe(() => console.log(trrack.state));
```

### With Custom Checkpoint Config

```typescript
const trrack = createTrrack({
  initialState: { count: 0 },
  checkpoint: { maxChainLength: 20 },
})
.build();
```

### With Additional Enhancers

```typescript
const trrack = createTrrack({ initialState: { count: 0 } })
  .with(withMetadata())
  .with(withPersistence())  // OK: metadata is present
  .build();

trrack.metadata.add('bookmark', { label: 'checkpoint' });
const saved = trrack.export();
```

### Dependency Error

```typescript
// ❌ Type error: persistence requires metadata
const trrack = createTrrack({ initialState })
  .with(withPersistence())  // Error!
  .build();

// ✅ Correct order
const trrack = createTrrack({ initialState })
  .with(withMetadata())
  .with(withPersistence())
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
| 2025-01-30 | Reactivity as enhancer (`withSubscription`) | Keeps core minimal, consistent plugin-oriented architecture |
| 2025-01-30 | Default enhancers always applied | Batteries-included experience; TrrackCore is internal only |
| 2025-01-30 | `unknown` payload in core, typed via registry | Core stays simple; `withRegistry()` adds type safety for those who want it |
| 2025-01-30 | Immer patches over JSON Patch (RFC 6902) | Already using Immer; inverse patches for free; convert on export for interop |
| 2025-01-30 | Hybrid checkpoint logic (chain + count + ratio) | Bounds resolution time, handles edge cases, configurable for power users |
| 2025-01-30 | Patch storage in core, not enhancer | Automatic optimization; users shouldn't think about storage strategy |
| 2025-01-30 | nanoid for node IDs | Short, fast, collision-safe |
| 2025-01-30 | Checkpoint config supports object or function | Object for simple overrides, function for full custom logic |
| 2025-01-30 | Export `defaultShouldCheckpoint` | Custom functions can defer to default logic |
