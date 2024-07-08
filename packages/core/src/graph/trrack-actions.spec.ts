import { createRootNode, createStateNode } from './nodes';
import {
    addMetadataToTrrackNode,
    addNodeToTrrackGraph,
    changeCurrentInTrrackGraph,
    createTrrackGraph,
    loadTrrackGraph,
} from './trrack-actions';
import { TrrackGraph } from './types';

describe('Trrack Graph Manager Actions', () => {
    it('should create a trrack graph', () => {
        const root = createRootNode<unknown>({ state: {} });

        const craftedGraph: TrrackGraph<unknown, string> = {
            nodes: {
                [root.id]: root,
            },
            root: root.id,
            current: root.id,
        };

        const createdGraph = createTrrackGraph(root);

        expect(createdGraph).toEqual(craftedGraph);
    });

    it('should add a node to a trrack graph', () => {
        const root = createRootNode({ state: {} });

        const graph = createTrrackGraph(root);

        const node = createStateNode({
            parent: root,
            state: {
                type: 'checkpoint',
                val: {},
            },
            event: 'new-node',
            label: 'adding new node',
        });

        const newGraph = addNodeToTrrackGraph(graph, node);

        expect(newGraph.nodes[node.id]).toEqual(node);
        expect(newGraph.nodes[root.id].children).toContain(node.id);
        expect(newGraph.current).toEqual(node.id);
    });

    it('should change the current node in a trrack graph', () => {
        const root = createRootNode({ state: {} });

        const graph = createTrrackGraph(root);

        const node = createStateNode({
            parent: root,
            state: {
                type: 'checkpoint',
                val: {},
            },
            event: 'new-node',
            label: 'adding new node',
        });

        const newGraph = addNodeToTrrackGraph(graph, node);

        const changedGraph = changeCurrentInTrrackGraph(newGraph, root.id);

        expect(changedGraph.current).toEqual(root.id);
    });

    it('should throw an error when changing to a non-existent node', () => {
        const root = createRootNode({ state: {} });

        const graph = createTrrackGraph(root);

        const node = createStateNode({
            parent: root,
            state: {
                type: 'checkpoint',
                val: {},
            },
            event: 'new-node',
            label: 'adding new node',
        });

        const newGraph = addNodeToTrrackGraph(graph, node);

        expect(() => {
            changeCurrentInTrrackGraph(newGraph, 'non-existent-node');
        }).toThrowError('Node with id non-existent-node not found');
    });

    it('should load a new trrack graph', () => {
        const root = createRootNode({ state: {} });

        const graph = createTrrackGraph(root);

        const node = createStateNode({
            parent: root,
            state: {
                type: 'checkpoint',
                val: {},
            },
            event: 'new-node',
            label: 'adding new node',
        });

        const newGraph = addNodeToTrrackGraph(graph, node);

        const newRoot = createRootNode({ state: {} });

        const newGraph2 = createTrrackGraph(newRoot);

        const loadedGraph = loadTrrackGraph(newGraph, newGraph2);

        expect(loadedGraph).toEqual(newGraph2);
    });

    it('should add metadata to a node in a trrack graph', () => {
        const root = createRootNode({ state: {} });

        const graph = createTrrackGraph(root);

        const node = createStateNode({
            parent: root,
            state: {
                type: 'checkpoint',
                val: {},
            },
            event: 'new-node',
            label: 'adding new node',
        });

        const newGraph = addNodeToTrrackGraph(graph, node);

        const key = 'META_KEY';

        const metadata = {
            [key]: 'value',
        };

        const updatedGraph = addMetadataToTrrackNode(
            newGraph,
            node.id,
            metadata
        );

        const allMetadata = updatedGraph.nodes[node.id].meta;
        const testMetadata = allMetadata[key];
        const latestTestMetadata = testMetadata[testMetadata.length - 1];
        const { type, val } = latestTestMetadata;

        expect(type).toEqual(key);
        expect(val).toEqual(metadata[key]);
    });

    it('should throw an error when adding metadata to a non-existent node', () => {
        const root = createRootNode({ state: {} });

        const graph = createTrrackGraph(root);

        const node = createStateNode({
            parent: root,
            state: {
                type: 'checkpoint',
                val: {},
            },
            event: 'new-node',
            label: 'adding new node',
        });

        const newGraph = addNodeToTrrackGraph(graph, node);

        const key = 'META_KEY';

        const metadata = {
            [key]: 'value',
        };

        const id = 'random-id';

        expect(() => {
            const g = addMetadataToTrrackNode(newGraph, id, metadata);
            console.log(g);
        }).toThrowError(`Node with id "${id}" not found`);
    });

    // Continue
});
