import { castDraft, produce } from 'immer';
import { ID } from '../utils';
import {
    NodeId,
    RootTrrackNode,
    StateTrrackNode,
    TrrackNodeMetadata,
} from './nodes';
import { LatestTrrackNodeMetadata, TrrackGraph } from './types';

export function createTrrackGraph<State, Event extends string>(
    root: RootTrrackNode<State>
): TrrackGraph<State, Event> {
    return {
        nodes: {
            [root.id]: root,
        },
        root: root.id,
        current: root.id,
    };
}

export function addNodeToTrrackGraph<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    node: StateTrrackNode<State, Event>
): TrrackGraph<State, Event> {
    return produce(graph, (draft) => {
        draft.nodes[node.id] = castDraft(node);
        draft.nodes[node.parent].children.push(node.id);
        draft.current = node.id;
    });
}

export function changeCurrentInTrrackGraph<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    id: NodeId
): TrrackGraph<State, Event> {
    return produce(graph, (draft) => {
        if (!draft.nodes[id]) {
            throw new Error(`Node with id ${id} not found`);
        }
        draft.current = id;
    });
}

export function loadTrrackGraph<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    newGraph: TrrackGraph<State, Event>
): TrrackGraph<State, Event> {
    return produce(graph, (draft) => {
        draft.nodes = castDraft(newGraph.nodes);
        draft.current = newGraph.current;
        draft.root = newGraph.root;
    });
}

export function addMetadataToTrrackNode<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    id: NodeId,
    newMetadata: Record<string, unknown>
): TrrackGraph<State, Event> {
    return produce(graph, (draft) => {
        if (!draft.nodes[id]) {
            throw new Error(`Node with id "${id}" not found`);
        }

        const existingMetadata = draft.nodes[id].meta || {};

        const metadata = Object.keys(newMetadata).reduce((acc, key) => {
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push({
                type: key,
                id: ID.get(),
                val: newMetadata[key],
                createdOn: Date.now(),
            });

            return acc;
        }, existingMetadata);

        draft.nodes[id].meta = castDraft(metadata);
    });
}

export function replaceMetadataInTrrackNode<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    id: NodeId,
    newMetadata: TrrackNodeMetadata
): TrrackGraph<State, Event> {
    return produce(graph, (draft) => {
        if (!draft.nodes[id]) {
            throw new Error(`Node with id ${id} not found`);
        }
        draft.nodes[id].meta = castDraft(newMetadata);
    });
}

export function getAllMetadataFromTrrackNode<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    id: NodeId
) {
    if (!graph.nodes[id]) {
        throw new Error(`Node with id ${id} not found`);
    }

    return graph.nodes[id].meta || {};
}

export function getLatestMetadataFromTrrackNode<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    id: NodeId
): LatestTrrackNodeMetadata {
    return Object.keys(graph.nodes[id].meta).reduce((acc, key) => {
        const meta = graph.nodes[id].meta[key];
        acc[key] = meta[meta.length - 1];
        return acc;
    }, {} as LatestTrrackNodeMetadata);
}

export function getAllMetadataOfTypeFromTrrackNode<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    id: NodeId,
    type: string
) {
    const metadata = getAllMetadataFromTrrackNode(graph, id);
    return metadata[type] || [];
}

export function getLatestMetadataOfTypeFromTrrackNode<
    State,
    Event extends string
>(graph: TrrackGraph<State, Event>, id: NodeId, type: string) {
    const metadata = getLatestMetadataFromTrrackNode(graph, id);
    return metadata[type] || [];
}

export function addArtifactToTrrackNode<State, Event extends string>(
    graph: TrrackGraph<State, Event>,
    id: NodeId,
    artifact: unknown
): TrrackGraph<State, Event> {
    return produce(graph, (draft) => {
        if (!draft.nodes[id]) {
            throw new Error(`Node with id ${id} not found`);
        }
        draft.nodes[id].artifacts.push({
            id: ID.get(),
            createdOn: Date.now(),
            val: castDraft(artifact),
        });
    });
}
