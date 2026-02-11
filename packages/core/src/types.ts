import type { Draft, Patch } from 'mutative';
import type {
  LabelLike,
  NodeId,
  ProvenanceGraph,
  ProvenanceNode,
  RootNode,
} from './internal/types';

// --- Action Registry ---

declare const __actionBrand: unique symbol;

/** Opaque handle returned by `register()`. Carries `Args` as a phantom type. */
export interface TrrackAction<Args extends unknown[] = unknown[]> {
  readonly event: string;
  /** @internal Phantom type carrier — do not use directly */
  readonly [__actionBrand]: Args;
}

/** Configuration for registering an action. */
export interface ActionConfig<State, Args extends unknown[]> {
  label: LabelLike<State>;
  recipe: (draft: Draft<State>, ...args: Args) => void;
}

// --- Trrack (public API) ---

/** Public user-facing API. Returned by builder's `.build()`. */
export interface Trrack<State> {
  currentState(): State;
  current(): Readonly<ProvenanceNode<State>>;
  root(): Readonly<RootNode<State>>;

  register<Args extends unknown[]>(
    event: string,
    config: ActionConfig<State, Args>,
  ): TrrackAction<Args>;
  apply<Args extends unknown[]>(action: TrrackAction<Args>, ...args: Args): void;
  getState(): State;
  getState(id: NodeId): State;
  getNode(id: NodeId): Readonly<ProvenanceNode<State>>;
}

// --- TrrackCore (internal API, extends Trrack) ---

/** Internal API exposed to plugins via `setup()`. Adds graph access and low-level mutation. */
export interface TrrackCore<State> extends Trrack<State> {
  graph(): ProvenanceGraph<State>;
  generateId(): NodeId;
  initialState(): Readonly<State>;

  record(event: string, label: string, newState: State, patches: Patch[]): void;
  setCurrent(id: NodeId): void;
}
