import { createStateNode, DEFAULT_ROOT_LABEL } from './nodes';
import { initializeTrrackGraph } from './trrack-graph';

describe('Trrack Graph', () => {
    describe('initializeTrrackGraph', () => {
        it('should initialize a trrack graph with default config.', () => {
            const state = { count: 0 };
            const graph = initializeTrrackGraph(state);

            expect(graph).toBeDefined();
            expect(graph.initialState).toEqual(state);
            expect(graph.root.label).toEqual(DEFAULT_ROOT_LABEL);
        });

        it('should initialize a trrack graph with custom root label and metadata.', () => {
            const state = { count: 0 };
            const rootLabel = 'Custom Root';
            const metadata = {
                custom: 'metadata',
            };

            const graph = initializeTrrackGraph(state, { rootLabel, metadata });

            const nodeMetadata = graph.root.meta['custom'];

            expect(graph).toBeDefined();
            expect(graph.initialState).toEqual(state);
            expect(graph.root.label).toEqual(rootLabel);
            expect(nodeMetadata[0].type).toEqual('custom');
            expect(nodeMetadata[0].val).toEqual(metadata.custom);
        });
    });

    describe('currentChange Event Handler', () => {
        it('should listen to current change event.', () => {
            const state = { count: 0 };
            const graph = initializeTrrackGraph(state);
            const listener = vi.fn();

            graph.currentChange(listener);

            graph.actions.addNode(
                createStateNode({
                    parent: graph.root,
                    state: {
                        type: 'checkpoint',
                        val: { count: 1 },
                    },
                    event: 'Test',
                    label: 'Test',
                })
            );

            expect(listener).toBeCalledTimes(1);
        });

        it('should remove listener.', () => {
            const state = { count: 0 };
            const graph = initializeTrrackGraph(state);
            const listener = vi.fn();

            const removeListener = graph.currentChange(listener);

            graph.actions.addNode(
                createStateNode({
                    parent: graph.root,
                    state: {
                        type: 'checkpoint',
                        val: { count: 1 },
                    },
                    event: 'Test',
                    label: 'Test',
                })
            );

            expect(listener).toBeCalledTimes(1);

            listener.mockReset();
            removeListener();

            expect(listener).not.toBeCalled();
        });
    });
});
