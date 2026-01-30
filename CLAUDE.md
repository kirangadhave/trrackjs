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
│   ├── core/          # Core provenance tracking library (@trrack/core)
│   └── redux/         # Redux Toolkit integration (@trrack/redux)
├── apps/
│   ├── react-trrack-example/    # React example
│   ├── rtk-trrack-example/      # Redux Toolkit example
│   └── trrack-lineup-example/   # LineUp visualization example
```

## Core Concepts

### Provenance Graph
A DAG where each node represents application state after an action. The graph tracks:
- **RootNode**: Initial state (full snapshot)
- **StateNodes**: Subsequent states with parent references, events, and optional side effects

### State Storage
Intelligent switching between storage modes:
- **Checkpoint**: Full state snapshot (used when >50% of state changes)
- **Patches**: Incremental JSON patches referencing a checkpoint (using fast-json-patch)

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

## Commands

Current commands (may change during refactor):

```bash
# Install dependencies
yarn install

# Development
yarn dev:all                    # Run all example apps
npx nx serve react-trrack-example  # Run single example

# Testing
yarn test:all:watch            # Watch mode for all packages
npx nx test core               # Test core package
npx nx test redux              # Test redux package

# Building
npx nx build core              # Build core package
npx nx build redux             # Build redux package

# Linting
npx nx lint core
npx nx lint redux

# Release (CI)
yarn release                   # Semantic release for affected packages
```

## Current Architecture (Reference)

### Core Package (`packages/core`)

Key modules:
- `src/provenance/trrack.ts` - Main Trrack class and initialization
- `src/graph/provenance-graph.ts` - Redux-backed graph store
- `src/graph/components/node.ts` - Node type definitions
- `src/registry/` - Action registration system
- `src/event/` - Pub/sub event system

Public API:
```typescript
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

### Redux Package (`packages/redux`)

Wraps Redux Toolkit to automatically track actions:
- `TrrackableSliceCreator` - Enhanced `createSlice` with provenance
- `TrrackableStoreCreator` - Store factory with built-in tracking

## Refactor Goals

This is a **major version overhaul** (clean slate, no backwards compatibility):

1. **Simplify build system** - Consider removing Nx for simpler tooling
2. **Modernize dependencies** - Update all deps to latest versions
3. **API redesign** - Improve ergonomics and TypeScript inference
4. **Enhancer pattern** - Composable store wrappers for extensibility
5. **Performance** - Optimize for large graphs and memory efficiency
6. **New features** - Collaboration, persistence, visualization hooks

## Working with This Codebase

### For AI Assistants

- **Ask before major decisions** - Architecture, API design, dependency choices
- **Explore thoroughly** - Use the codebase exploration tools to understand context before changes
- **Keep it simple** - Avoid over-engineering; start minimal, add complexity when needed
- **Test changes** - Run tests after modifications
- **Preserve intent** - During refactors, understand the "why" behind existing code

### Key Files to Understand

- `packages/core/src/provenance/trrack.ts` - Heart of the library
- `packages/core/src/provenance/types.ts` - Core type definitions
- `packages/core/src/registry/registry.ts` - Action registration
- `packages/core/src/graph/provenance-graph.ts` - Graph state management

### Patterns in Use

- **Registry pattern** for action management
- **Immer** for immutable state updates
- **Redux Toolkit** internally for graph state
- **JSON Patch (RFC 6902)** for incremental state storage
- **Pub/sub** for event handling

## Notes

- Testing conventions: TBD (will be established during refactor)
- Naming conventions: TBD (will be established during refactor)
- Enhancer pattern implementation: TBD (design in progress)
