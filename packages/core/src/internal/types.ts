export type { Patch } from 'mutative';
import type { Patch } from 'mutative';

// --- NodeId (branded string) ---

declare const __nodeIdBrand: unique symbol;

/** Branded string type for node identifiers. Use `nodeId()` to create. */
export type NodeId = string & { readonly [__nodeIdBrand]: 'node-id' };

// --- State Storage ---

/** Full state snapshot. Root always uses this. */
export interface CheckpointStorage<State> {
  type: 'checkpoint';
  value: State;
}

/** Forward patches from nearest checkpoint to this node's state. */
export interface PatchStorage {
  type: 'patch';
  /** Forward-only patches (parent state → this node's state) */
  patches: Patch[];
  /** NodeId of the nearest checkpoint ancestor */
  checkpointRef: NodeId;
  /** Number of patch nodes since last checkpoint */
  chainLength: number;
}

export type StateStorage<State> = CheckpointStorage<State> | PatchStorage;

// --- Labels ---

interface LabelContext<State> {
  newState: State;
  previousState: State;
}

/** Label input type: string, no-arg thunk, or state-aware function. */
export type LabelLike<State> = string | ((ctx: LabelContext<State>) => string);

// --- Nodes ---

interface NodeBase {
  id: NodeId;
  type: 'root' | 'state';
  /** Human-readable description, e.g. 'Applied price filter' */
  label: string;
  /** Machine-readable action type, e.g. 'filter.apply' */
  event: string;
  createdAt: number;
  children: NodeId[];
  /** Plugin data, namespaced by plugin name */
  ext: Record<string, unknown>;
}

export interface RootNode<State> extends NodeBase {
  type: 'root';
  event: 'root';
  state: CheckpointStorage<State>;
}

export interface StateNode<State> extends NodeBase {
  type: 'state';
  parent: NodeId;
  state: StateStorage<State>;
}

export type ProvenanceNode<State> = RootNode<State> | StateNode<State>;

// --- Graph ---

export interface ProvenanceGraph<State> {
  nodes: Map<NodeId, ProvenanceNode<State>>;
  root: NodeId;
  current: NodeId;
  /** Graph-level plugin data, namespaced by plugin name */
  ext: Record<string, unknown>;
}
