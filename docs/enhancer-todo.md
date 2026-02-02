# Enhancer Pattern Implementation

## Status: In Progress

---

## Overview

Implement the builder-based enhancer pattern for Trrack v2, enabling composable features with type-safe dependency checking.

---

## TODO

### Phase 1: Types & Foundation ✅

- [x] **Create enhancer types** (`src/types/enhancer/`)
  - `EnhancerFn<In, Out>` - function that enhances an instance
  - `Enhancer<In, Out, Deps>` - enhancer definition with metadata
  - `TrrackBuilder<State, API, Enhancers>` - builder interface

- [x] **Create API types for default enhancers**
  - `NavigationAPI` - undo/redo/canUndo/canRedo
  - `ReactivityAPI<State>` - subscribe(listener) with state param
  - `DefaultTrrack<State>` - TrrackCore + defaults

### Phase 2: Default Enhancers ✅

- [x] **Implement `withNavigation()`** (`src/enhancers/navigation.ts`)
  - `undo()` - navigate to parent node
  - `redo()` - navigate to last child
  - `canUndo` - true if current is not root
  - `canRedo` - true if current has children

- [x] **Implement `withReactivity()`** (`src/enhancers/reactivity.ts`)
  - `subscribe(listener)` - returns unsubscribe function, listener receives state
  - Wrap `record()` and `setCurrent()` to notify listeners

### Phase 3: Builder ✅

- [x] **Implement builder** (`src/builder.ts`)
  - `createBuilder()` - internal factory
  - `.with(enhancer)` - chain enhancers with dependency checking
  - `.withIf(condition, enhancer)` - conditional enhancement
  - `.build()` - return final instance

- [x] **Implement `createTrrack()`** (`src/builder.ts`)
  - Create TrrackCore internally
  - Apply default enhancers (navigation, reactivity)
  - Return builder for optional extensions

### Phase 4: Exports & Integration ✅

- [x] **Update exports** (`src/index.ts`)
  - Export types: Enhancer, TrrackBuilder, NavigationAPI, etc.
  - Export: defineEnhancer, withNavigation, withReactivity
  - Export: createTrrack
  - Keep createTrrackCore for advanced use cases

- [x] **Create enhancers barrel** (`src/enhancers/index.ts`)
  - Re-export all enhancers

### Phase 5: Tests

- [ ] **Enhancer tests** (`tests/enhancer.test.ts`)
  - Basic builder usage
  - Default enhancers work (undo/redo/subscribe)
  - Custom enhancer definition
  - Dependency error (runtime)
  - withIf conditional logic

- [ ] **Navigation tests** (`tests/navigation.test.ts`)
  - undo/redo behavior
  - canUndo/canRedo correctness
  - Edge cases (at root, at leaf)

- [ ] **Reactivity tests** (`tests/reactivity.test.ts`)
  - subscribe/unsubscribe
  - Notifications on record
  - Notifications on setCurrent

---

## File Structure

```
packages/core/src/
├── types/
│   ├── index.ts              # Re-exports all types
│   ├── enhancer/
│   │   ├── index.ts          # Enhancer type exports
│   │   ├── types.ts          # Enhancer, EnhancerFn, TrrackBuilder
│   │   ├── navigation.ts     # NavigationAPI
│   │   └── reactivity.ts   # ReactivityAPI, DefaultTrrack
│   └── ...existing
├── enhancers/
│   ├── index.ts              # Barrel export
│   ├── define.ts             # defineEnhancer()
│   ├── navigation.ts         # withNavigation()
│   └── reactivity.ts       # withReactivity()
├── builder.ts                # createTrrack(), createBuilder()
├── core.ts                   # Internal TrrackCore factory
└── index.ts                  # Public API exports
```

---

## API Design

### Usage

```typescript
// Basic (defaults only)
const trrack = createTrrack({ initialState: { count: 0 } })
  .build();

trrack.undo();
trrack.subscribe((state) => console.log(state.count));

// With optional enhancers (future)
const trrack = createTrrack({ initialState })
  .with(withMetadata())
  .with(withPersistence())  // requires metadata
  .build();
```

### Enhancer Definition

```typescript
const withNavigation = <State>() => defineEnhancer<
  TrrackCore<State>,
  NavigationAPI
>({
  name: 'navigation',
  enhance: (trrack) => ({
    ...trrack,
    undo() { /* ... */ },
    redo() { /* ... */ },
    get canUndo() { /* ... */ },
    get canRedo() { /* ... */ },
  }),
});
```

### Dependency Checking

```typescript
// Type-level: Input type must include dependencies
const withPersistence = <State>() => defineEnhancer<
  TrrackCore<State> & MetadataAPI,  // TS error if metadata missing
  PersistenceAPI
>({
  name: 'persistence',
  dependencies: ['metadata'],  // Runtime check
  enhance: (trrack) => { /* ... */ },
});
```

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| `.with(enhancer)` takes instance, not factory | Simpler API, aligns with design doc examples |
| Enhancer factories like `withNav<State>()` | Enables configuration + state type inference |
| Runtime + type-level dependency checks | Types catch most; runtime catches JS users |
| Defaults always applied internally | Batteries-included; users don't see TrrackCore |
| Reactivity wraps after navigation | Ensures nav methods trigger notifications |
| Removed `withIf` | Users can use regular JS conditionals instead |
| Renamed `DefaultTrrack` to `Trrack` | Cleaner public API |
| `subscribe(listener)` receives state | More ergonomic - no need to access `trrack.state` |

---

## Notes

- Start with minimal implementations, iterate
- Navigation redo goes to last child (simplest default)
- Can add `redo({ to: 'first' | 'last' })` later if needed
- Reactivity is simple for now; granular reactivitys can come later
