import {
  addNode,
  createGraph,
  getCurrent,
  getNode,
  getRoot,
  nodeId,
  setCurrent,
} from '../../src/internal';
import { makeStateNode } from '../fixtures/nodes';

describe('createGraph', () => {
  it('creates a graph with a single root node', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });

    expect(graph.nodes.size).toBe(1);
    expect(graph.root).toBe(graph.current);
  });

  it('root node has correct structure', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });
    const root = getRoot(graph);

    expect(root.type).toBe('root');
    expect(root.label).toBe('Root');
    expect(root.event).toBe('root');
    expect(root.children).toEqual([]);
    expect(root.ext).toEqual({});
    expect(root.state).toEqual({ type: 'checkpoint', value: { count: 0 } });
    expect(typeof root.createdAt).toBe('number');
  });

  it('uses custom id generator', () => {
    let counter = 0;
    const { graph } = createGraph({
      initialState: { count: 0 },
      generateId: () => `id-${++counter}`,
    });

    expect(graph.root).toBe('id-1');
  });
});

describe('getNode', () => {
  it('returns an existing node', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });
    const node = getNode(graph, graph.root);
    expect(node.id).toBe(graph.root);
  });

  it('throws for non-existent id', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });
    expect(() => getNode(graph, nodeId('missing'))).toThrow('Node not found: missing');
  });
});

describe('getRoot', () => {
  it('returns the root node', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });
    const root = getRoot(graph);
    expect(root.type).toBe('root');
    expect(root.id).toBe(graph.root);
  });
});

describe('getCurrent', () => {
  it('returns current node (initially root)', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });
    const current = getCurrent(graph);
    expect(current.id).toBe(graph.root);
  });
});

describe('addNode', () => {
  it('adds node to the graph', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makeStateNode({ id: generateId(), parent: graph.root });

    addNode(graph, node);

    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.get(node.id)).toBe(node);
  });

  it('updates parent children', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makeStateNode({ id: generateId(), parent: graph.root });

    addNode(graph, node);

    const root = getRoot(graph);
    expect(root.children).toContain(node.id);
  });

  it('does NOT move current pointer', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makeStateNode({ id: generateId(), parent: graph.root });

    addNode(graph, node);

    expect(graph.current).toBe(graph.root);
  });

  it('throws if parent does not exist', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makeStateNode({ id: generateId(), parent: nodeId('missing') });

    expect(() => addNode(graph, node)).toThrow('Node not found: missing');
  });

  it('supports branching (multiple children on same parent)', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });

    const nodeA = makeStateNode({ id: generateId(), parent: graph.root });
    const nodeB = makeStateNode({ id: generateId(), parent: graph.root });

    addNode(graph, nodeA);
    addNode(graph, nodeB);

    const root = getRoot(graph);
    expect(root.children).toEqual([nodeA.id, nodeB.id]);
    expect(graph.nodes.size).toBe(3);
  });
});

describe('setCurrent', () => {
  it('updates the current pointer', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makeStateNode({ id: generateId(), parent: graph.root });
    addNode(graph, node);

    setCurrent(graph, node.id);

    expect(graph.current).toBe(node.id);
  });

  it('throws for non-existent node', () => {
    const { graph } = createGraph({ initialState: { count: 0 } });
    expect(() => setCurrent(graph, nodeId('missing'))).toThrow('Node not found: missing');
  });

  it('allows setting back to root', () => {
    const { graph, generateId } = createGraph({ initialState: { count: 0 } });
    const node = makeStateNode({ id: generateId(), parent: graph.root });
    addNode(graph, node);
    setCurrent(graph, node.id);

    setCurrent(graph, graph.root);

    expect(graph.current).toBe(graph.root);
  });
});
