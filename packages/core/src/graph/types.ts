import { Unsubscribe } from '../event-manager/types';
import {
    Metadata,
    NodeId,
    Nodes,
    RootTrrackNode,
    StateTrrackNode,
    TrrackNode,
    TrrackNodeMetadata,
} from './nodes';

// -------------------
// Event Types
// -------------------

// Current Change
export type CurrentChangeTrigger = 'traversal' | 'new';
export type CurrentChangeHandler = (trigger: CurrentChangeTrigger) => void;
export type CurrentChangeHandlerConfig = {
    skipOnNew?: boolean;
    skipEvent?: CurrentChangeTrigger;
};

// Metadata Change
export type MetadataEventTrigger = 'add' | 'replace';
export type MetadataChangeHandler = (
    id: NodeId,
    newMetadata: Record<string, unknown>,
    type: MetadataEventTrigger
) => void;
export type MetadataChangeHandlerConfig = {
    skipEvent: MetadataEventTrigger;
};

// Unsubscribe
export type UnsubscribeListener = Unsubscribe;

// -------------------
// Trrack Graph
// -------------------
export type TrrackGraph<State, Event extends string> = {
    root: NodeId;
    nodes: Nodes<State, Event>;
    current: NodeId;
};

export type LatestTrrackNodeMetadata = {
    [K in keyof TrrackNodeMetadata]: TrrackNodeMetadata[K][number];
};

export type TrrackGraphActions<State, Event extends string> = {
    addNode(node: StateTrrackNode<State, Event>): void;
    changeCurrent(id: NodeId): void;
    loadGraph(graph: TrrackGraph<State, Event>): void;
    addMetadata(id: NodeId, metadata: Record<string, unknown>): void;
    replaceMetadata(id: NodeId, metadata: Record<string, unknown>): void;
    addArtifact(id: NodeId, artifact: unknown): void;
    getAllMetadata(id?: NodeId): TrrackNodeMetadata;
    getLatestMetadata(id?: NodeId): LatestTrrackNodeMetadata;
    getAllMetadataOfType(type: string, id?: NodeId): Array<Metadata<unknown>>;
    getLatestMetadataOfType(type: string, id?: NodeId): Metadata<unknown>;
};

export type TrrackGraphConfig = {
    artifact: unknown;
    metadata: Record<string, unknown>;
    rootLabel: string;
};

export type TrrackGraphManager<State, Event extends string> = {
    initialState: State;
    backend: TrrackGraph<State, Event>;
    current: TrrackNode<State, Event>;
    root: RootTrrackNode<State>;
    currentChange(
        fn: CurrentChangeHandler,
        config?: CurrentChangeHandlerConfig
    ): UnsubscribeListener;
    metadataChange(
        fn: MetadataChangeHandler,
        config?: MetadataChangeHandlerConfig
    ): UnsubscribeListener;
    actions: TrrackGraphActions<State, Event>;
};

// -------------------
// Type aliases for backwards compatibility.
// -------------------

/**
 * Type alias for **TrrackGraph**.
 * Use **TrrackGraph** instead of **ProvenanceGraph**. Only exists for backwards compatibility.
 */
export type ProvenanceGraph<State, Event extends string> = TrrackGraph<
    State,
    Event
>;

/**
 * Type alias for **CurrentChangeTrigger**.
 *
 * Use **CurrentChangeTrigger** instead of **Trigger**. Only exists for backwards compatibility.
 */
export type Trigger = CurrentChangeTrigger;
