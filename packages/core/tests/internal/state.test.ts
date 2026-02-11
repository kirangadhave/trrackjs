import { addNode, createGraph, produceNextState, resolveState } from '../../src/internal';
import { makeCheckpointNode, makePatchNode } from '../fixtures/state';

describe('resolveState', () => {
  it('returns checkpoint value directly for root node', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });

    expect(resolveState(graph, graph.root)).toEqual({ count: 0 });
  });

  it('returns checkpoint value directly for checkpoint state node', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makeCheckpointNode({ id: generateId(), parent: graph.root, value: { count: 5 } });
    addNode(graph, node);

    expect(resolveState(graph, node.id)).toEqual({ count: 5 });
  });

  it('resolves state from a single patch node', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makePatchNode({
      id: generateId(),
      parent: graph.root,
      checkpointRef: graph.root,
      chainLength: 1,
      baseState: { count: 0 },
      recipe: (draft) => {
        draft.count = 1;
      },
    });
    addNode(graph, node);

    expect(resolveState(graph, node.id)).toEqual({ count: 1 });
  });

  it('resolves state through a chain of patch nodes', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });

    const node1 = makePatchNode({
      id: generateId(),
      parent: graph.root,
      checkpointRef: graph.root,
      chainLength: 1,
      baseState: { count: 0 },
      recipe: (draft) => {
        draft.count = 1;
      },
    });
    addNode(graph, node1);

    const node2 = makePatchNode({
      id: generateId(),
      parent: node1.id,
      checkpointRef: graph.root,
      chainLength: 2,
      baseState: { count: 1 },
      recipe: (draft) => {
        draft.count = 2;
      },
    });
    addNode(graph, node2);

    expect(resolveState(graph, node2.id)).toEqual({ count: 2 });
  });

  it('resolves through mixed checkpoint and patch nodes', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });

    const checkpoint = makeCheckpointNode({
      id: generateId(),
      parent: graph.root,
      value: { count: 10 },
    });
    addNode(graph, checkpoint);

    const patchNode = makePatchNode({
      id: generateId(),
      parent: checkpoint.id,
      checkpointRef: checkpoint.id,
      chainLength: 1,
      baseState: { count: 10 },
      recipe: (draft) => {
        draft.count = 11;
      },
    });
    addNode(graph, patchNode);

    expect(resolveState(graph, patchNode.id)).toEqual({ count: 11 });
  });

  it('preserves structural sharing via immutable apply', () => {
    const items = ['a', 'b'];
    const initial = { count: 0, items };
    const { graph, generateId } = createGraph({ initialState: initial });

    const node = makePatchNode({
      id: generateId(),
      parent: graph.root,
      checkpointRef: graph.root,
      chainLength: 1,
      baseState: initial,
      recipe: (draft) => {
        draft.count = 1;
      },
    });
    addNode(graph, node);

    const resolved = resolveState(graph, node.id) as { count: number; items: string[] };
    expect(resolved.count).toBe(1);
    expect(resolved.items).toBe(items); // same reference — structural sharing
  });
});

describe('produceNextState', () => {
  it('produces new state with mutations', () => {
    const { newState, patches } = produceNextState({ count: 0 }, (draft) => {
      draft.count = 5;
    });

    expect(newState).toEqual({ count: 5 });
    expect(patches.length).toBeGreaterThan(0);
  });

  it('returns same reference when no mutations', () => {
    const original = { count: 0 };
    const { newState, patches } = produceNextState(original, () => {});

    expect(newState).toBe(original);
    expect(patches).toEqual([]);
  });

  it('preserves structural sharing for unchanged parts', () => {
    const items = ['a', 'b'];
    const original = { count: 0, items };
    const { newState } = produceNextState(original, (draft) => {
      draft.count = 1;
    });

    expect(newState).not.toBe(original);
    expect(newState.count).toBe(1);
    expect(newState.items).toBe(items); // same reference
  });
});
