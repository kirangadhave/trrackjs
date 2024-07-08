import { initEventManager } from '../event-manager';
import { NodeId, createRootNode, isRootNode } from './nodes';
import {
    addArtifactToTrrackNode,
    addMetadataToTrrackNode,
    addNodeToTrrackGraph,
    changeCurrentInTrrackGraph,
    createTrrackGraph,
    getAllMetadataFromTrrackNode,
    getLatestMetadataFromTrrackNode,
    loadTrrackGraph,
} from './trrack-actions';
import {
    CurrentChangeHandler,
    CurrentChangeHandlerConfig,
    MetadataChangeHandler,
    MetadataChangeHandlerConfig,
    MetadataEventTrigger,
    Trigger,
    TrrackGraph,
    TrrackGraphConfig,
    TrrackGraphManager,
} from './types';

export function initializeTrrackGraph<State, Event extends string>(
    state: State,
    config?: Partial<TrrackGraphConfig>
): TrrackGraphManager<State, Event> {
    /**
     * Constants
     */
    const CURRENT_CHANGE_EVENT = 'current-change';
    const METADATA_CHANGED = 'metadata-changed';

    const { rootLabel = 'Root', artifact, metadata } = config || {};

    const rootNode = createRootNode<State>({
        state,
        label: rootLabel,
        initialArtifact: artifact,
        initialMetadata: metadata,
    });

    let graph: TrrackGraph<State, Event> = createTrrackGraph(rootNode);
    const listenerManager = initEventManager();

    return {
        initialState: state,
        get backend() {
            return graph;
        },
        get current() {
            return graph.nodes[graph.current];
        },
        get root() {
            const node = graph.nodes[graph.root];
            if (isRootNode(node)) {
                return node;
            }
            throw new Error('Root node not found');
        },
        currentChange(
            fn: CurrentChangeHandler,
            config: CurrentChangeHandlerConfig = {}
        ) {
            return listenerManager.listen(
                CURRENT_CHANGE_EVENT,
                (trigger: Trigger) => {
                    const { skipEvent, skipOnNew } = config; // Extract skip conditions

                    // skipEvent takes preference
                    const skipOn = skipEvent
                        ? skipEvent === trigger
                        : skipOnNew
                        ? 'new' === trigger
                        : false;

                    if (skipOn) return;

                    fn(trigger);
                }
            );
        },
        metadataChange(
            fn: MetadataChangeHandler,
            config: MetadataChangeHandlerConfig
        ) {
            return listenerManager.listen(
                METADATA_CHANGED,
                (
                    id: NodeId,
                    newMetadata: Record<string, unknown>,
                    type: MetadataEventTrigger
                ) => {
                    const { skipEvent } = config;

                    if (skipEvent && skipEvent === type) return;

                    return fn(id, newMetadata, type);
                }
            );
        },
        actions: {
            addNode(node) {
                graph = addNodeToTrrackGraph(graph, node);
                listenerManager.fire(CURRENT_CHANGE_EVENT, 'new');
            },
            changeCurrent(id) {
                graph = changeCurrentInTrrackGraph(graph, id);
                listenerManager.fire(CURRENT_CHANGE_EVENT, 'traversal');
            },
            loadGraph(newGraph) {
                graph = loadTrrackGraph(graph, newGraph);
                listenerManager.fire(CURRENT_CHANGE_EVENT, 'traversal');
            },
            addMetadata(id, metadata) {
                graph = addMetadataToTrrackNode(graph, id, metadata);
                listenerManager.fire(METADATA_CHANGED, id, metadata, 'add');
            },
            replaceMetadata(id, metadata) {
                graph = addMetadataToTrrackNode(graph, id, metadata);
                listenerManager.fire(METADATA_CHANGED, id, metadata, 'replace');
            },
            getAllMetadata(id = graph.current) {
                return getAllMetadataFromTrrackNode(graph, id);
            },
            getLatestMetadata(id = graph.current) {
                return getLatestMetadataFromTrrackNode(graph, id);
            },
            getAllMetadataOfType(type: string, id = graph.current) {
                const metadata = getAllMetadataFromTrrackNode(graph, id);
                return metadata[type];
            },
            getLatestMetadataOfType(type, id = graph.current) {
                const metadata = getLatestMetadataFromTrrackNode(graph, id);
                return metadata[type];
            },
            addArtifact(id, artifact) {
                graph = addArtifactToTrrackNode(graph, id, artifact);
            },
        },
    };
}

// Aliases for backwards compatibility.

/**
 * Alias for ** initializeTrrackGraph**.
 */
export const initializeProvenanceGraph = initializeTrrackGraph;
