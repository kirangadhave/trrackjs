/* eslint-disable @typescript-eslint/no-explicit-any */
import { PayloadAction } from '@reduxjs/toolkit';
import { Operation } from 'fast-json-patch';

import { FlavoredId } from '../../utils';

export type NodeId = FlavoredId<string, 'Node'>;

type Checkpoint<State> = {
    type: 'checkpoint';
    val: State;
};

type Patches = {
    type: 'patch';
    checkpointRef: NodeId;
    val: Array<Operation>;
};

export type StateLike<State> = Checkpoint<State> | Patches;

/**
 * Node Artifact Type
 */

/**
 * Artifact Types
 */
export type ArtifactId = FlavoredId<string, 'Artifact'>;

export type Artifact = {
    id: ArtifactId;
    createdOn: number;
    val: unknown;
};

export type NodeArtifact = Array<Artifact>;

/**
 * Node Metadata Type
 */
export type MetadataId = FlavoredId<string, 'Metadata'>;

export type Metadata<T = unknown> = {
    id: MetadataId;
    type: string;
    createdOn: number;
    val: T;
};

export type TrrackNodeMetadata = {
    annotation: Array<Metadata<string>>;
    bookmark: Array<Metadata<boolean>>;
    [key: string]: Array<Metadata<unknown>>;
};

/**
 * Node Types
 */
type BaseTrrackNode<State> = {
    label: string;
    id: NodeId;
    createdOn: number;
    artifacts: NodeArtifact;
    meta: TrrackNodeMetadata;
    children: NodeId[];
    state: StateLike<State>;
    level: number;
};

export type RootTrrackNode<State> = BaseTrrackNode<State> & { event: 'Root' };

export type SideEffects = {
    do: Array<PayloadAction<any, any>>;
    undo: Array<PayloadAction<any, any>>;
};

export type StateTrrackNode<
    State,
    Event extends string
> = BaseTrrackNode<State> & {
    event: Event;
    parent: NodeId;
    sideEffects: SideEffects;
};

export type TrrackNode<State, Event extends string> =
    | RootTrrackNode<State>
    | StateTrrackNode<State, Event>;

export type TrrackNodes<State, Event extends string> = Record<
    string,
    TrrackNode<State, Event>
>;

// Type aliases for backwards compatibility
/**
 * Type alias for **TrrackNodeMetadata**.
 *
 * Exists for backwards compatibility.
 *
 * Use **TrrackNodeMetadata** instead of **NodeMetadata**.
 */
export type NodeMetadata = TrrackNodeMetadata;

/**
 * Type alias for **RootTrrackNode**.
 *
 * Exists for backwards compatibility.
 *
 * Use **RootTrrackNode** instead of **RootNode**.
 */
export type RootNode<State> = RootTrrackNode<State>;

/**
 * Type alias for **StateTrrackNode**.
 *
 * Exists for backwards compatibility.
 *
 * Use **StateTrrackNode** instead of **StateNode**.
 */
export type StateNode<State, Event extends string> = StateTrrackNode<
    State,
    Event
>;

/**
 * Type alias for **TrrackNode**.
 *
 * Exists for backwards compatibility.
 *
 * Use **TrrackNode** instead of **ProvenanceNode**.
 */
export type ProvenanceNode<State, Event extends string> = TrrackNode<
    State,
    Event
>;

/**
 * Type alias for **TrrackNodes**.
 *
 * Exists for backwards compatibility.
 *
 * Use **TrrackNodes** instead of **Nodes**.
 */
export type Nodes<State, Event extends string> = TrrackNodes<State, Event>;
