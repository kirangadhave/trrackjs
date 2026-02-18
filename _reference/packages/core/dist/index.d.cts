import { Patch, Draft } from 'mutative';
export { Patch } from 'mutative';

declare const __nodeIdBrand: unique symbol;
/** Branded string type for node identifiers. Use `nodeId()` to create. */
type NodeId = string & {
    readonly [__nodeIdBrand]: 'node-id';
};
/** Full state snapshot. Root always uses this. */
interface CheckpointStorage<State> {
    type: 'checkpoint';
    value: State;
}
/** Forward patches from nearest checkpoint to this node's state. */
interface PatchStorage {
    type: 'patch';
    /** Forward-only patches (parent state → this node's state) */
    patches: Patch[];
    /** NodeId of the nearest checkpoint ancestor */
    checkpointRef: NodeId;
    /** Number of patch nodes since last checkpoint */
    chainLength: number;
}
type StateStorage<State> = CheckpointStorage<State> | PatchStorage;
interface LabelContext<State> {
    newState: State;
    previousState: State;
}
/** Label input type: string, no-arg thunk, or state-aware function. */
type LabelLike<State> = string | ((ctx: LabelContext<State>) => string);
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
interface RootNode<State> extends NodeBase {
    type: 'root';
    event: 'root';
    state: CheckpointStorage<State>;
}
interface StateNode<State> extends NodeBase {
    type: 'state';
    parent: NodeId;
    state: StateStorage<State>;
}
type ProvenanceNode<State> = RootNode<State> | StateNode<State>;
interface ProvenanceGraph<State> {
    nodes: Map<NodeId, ProvenanceNode<State>>;
    root: NodeId;
    current: NodeId;
    /** Graph-level plugin data, namespaced by plugin name */
    ext: Record<string, unknown>;
}

/** Cast a raw string to NodeId. Used by id generator and deserialization. */
declare function nodeId(id: string): NodeId;

declare function isRootNode<State>(node: ProvenanceNode<State>): node is RootNode<State>;
declare function isStateNode<State>(node: ProvenanceNode<State>): node is StateNode<State>;

declare const DEFAULT_MAX_CHAIN_LENGTH = 10;
declare const DEFAULT_MAX_PATCH_COUNT = 50;
/** Context passed to checkpoint strategy for deciding checkpoint vs patch. */
interface CheckpointContext<State> {
    /** Number of patch nodes since last checkpoint */
    chainLength: number;
    /** Total patches accumulated in current chain */
    cumulativePatchCount: number;
    /** Mutative patches for this operation */
    patches: Patch[];
    /** The new state (already computed by produce) */
    newState: State;
    /** The previous state (already computed by produce) */
    previousState: State;
}
/** Threshold-based checkpoint config. */
interface CheckpointConfig {
    maxChainLength?: number;
    maxPatchCount?: number;
}
/** Checkpoint strategy function. Returns `true` if the node should store a full checkpoint. */
type CheckpointFn<State> = (ctx: CheckpointContext<State>) => boolean;
declare const CheckpointStrategy: {
    /** Always store a full checkpoint (every node). */
    readonly always: CheckpointFn<unknown>;
    /** Never store a checkpoint (only root has one). */
    readonly never: CheckpointFn<unknown>;
    /** Threshold-based strategy. Checkpoints when chain length or cumulative patch count exceeds thresholds. */
    readonly threshold: (config?: CheckpointConfig) => CheckpointFn<unknown>;
};

/**
 * Resolve the full state for a given node.
 *
 * - Checkpoint nodes: return the stored value directly.
 * - Patch nodes: walk from the node back to its checkpoint ancestor,
 *   collect patches in ancestor→descendant order, then apply sequentially.
 */
declare function resolveState<State>(graph: ProvenanceGraph<State>, nodeId: NodeId): State;
/** Result of producing a new state with Mutative. */
interface ProduceResult<State> {
    newState: State;
    patches: Patch[];
}
/**
 * Produce the next state from a recipe using Mutative.
 * Returns the new state and forward patches (inverse patches discarded).
 */
declare function produceNextState<State>(currentState: State, recipe: (draft: Draft<State>) => void): ProduceResult<State>;

declare const __actionBrand: unique symbol;
/** Opaque handle returned by `register()`. Carries `Args` as a phantom type. */
interface TrrackAction<Args extends unknown[] = unknown[]> {
    readonly event: string;
    /** @internal Phantom type carrier — do not use directly */
    readonly [__actionBrand]: Args;
}
/** Configuration for registering an action. */
interface ActionConfig<State, Args extends unknown[]> {
    label: LabelLike<State>;
    recipe: (draft: Draft<State>, ...args: Args) => void;
}
/** Public user-facing API. Returned by builder's `.build()`. */
interface Trrack<State> {
    currentState(): State;
    current(): Readonly<ProvenanceNode<State>>;
    root(): Readonly<RootNode<State>>;
    register<Args extends unknown[]>(event: string, config: ActionConfig<State, Args>): TrrackAction<Args>;
    apply<Args extends unknown[]>(action: TrrackAction<Args>, ...args: Args): void;
    getState(): State;
    getState(id: NodeId): State;
    getNode(id: NodeId): Readonly<ProvenanceNode<State>>;
}
/** Internal API exposed to plugins via `setup()`. Adds graph access and low-level mutation. */
interface TrrackCore<State> extends Trrack<State> {
    graph(): ProvenanceGraph<State>;
    generateId(): NodeId;
    initialState(): Readonly<State>;
    record(event: string, label: string, newState: State, patches: Patch[]): void;
    setCurrent(id: NodeId): void;
}

interface TrrackCoreConfig<State> {
    initialState: State;
    /** Checkpoint strategy function. Default: `CheckpointStrategy.threshold()` */
    checkpoint?: CheckpointFn<State>;
    /** Custom ID generator. Default: `crypto.randomUUID()` */
    generateId?: () => string;
    rootLabel?: string;
}
declare function createTrrackCore<State>(config: TrrackCoreConfig<State>): TrrackCore<State>;

/**
 * @trrack/core - Reproducible provenance tracking for web applications
 *
 * @packageDocumentation
 */
declare const VERSION = "2.0.0-alpha.0";

export { type ActionConfig, type CheckpointConfig, type CheckpointContext, type CheckpointFn, type CheckpointStorage, CheckpointStrategy, DEFAULT_MAX_CHAIN_LENGTH, DEFAULT_MAX_PATCH_COUNT, type LabelLike, type NodeId, type PatchStorage, type ProduceResult, type ProvenanceGraph, type ProvenanceNode, type RootNode, type StateNode, type StateStorage, type Trrack, type TrrackAction, type TrrackCore, type TrrackCoreConfig, VERSION, createTrrackCore, isRootNode, isStateNode, nodeId, produceNextState, resolveState };
