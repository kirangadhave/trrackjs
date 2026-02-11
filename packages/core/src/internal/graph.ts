import { createIdGenerator } from './node-id';
import type { NodeId, ProvenanceGraph, ProvenanceNode, RootNode, StateNode } from './types';

// --- Config ---

export interface CreateGraphConfig<State> {
  initialState: State;
  rootLabel?: string;
  generateId?: () => string;
}

// --- Creation ---

/** Create a new provenance graph with a root node. */
export function createGraph<State>(config: CreateGraphConfig<State>) {
  const generateId = createIdGenerator(config.generateId);
  const rootLabel = config.rootLabel ?? 'Root';
  const rootId = generateId();

  const rootNode: RootNode<State> = {
    id: rootId,
    type: 'root',
    label: rootLabel,
    event: 'root',
    createdAt: Date.now(),
    children: [],
    ext: {},
    state: {
      type: 'checkpoint',
      value: config.initialState,
    },
  };

  const graph: ProvenanceGraph<State> = {
    nodes: new Map([[rootId, rootNode]]),
    root: rootId,
    current: rootId,
    ext: {},
  };

  return { graph, generateId };
}

// --- Operations ---

/** Returns node by id. Throws if not found (programmer error). */
export function getNode<State>(graph: ProvenanceGraph<State>, id: NodeId): ProvenanceNode<State> {
  const node = graph.nodes.get(id);
  if (!node) {
    throw new Error(`Node not found: ${id}`);
  }
  return node;
}

/** Returns the root node. */
export function getRoot<State>(graph: ProvenanceGraph<State>): RootNode<State> {
  return getNode(graph, graph.root) as RootNode<State>;
}

/** Returns the current node. */
export function getCurrent<State>(graph: ProvenanceGraph<State>): ProvenanceNode<State> {
  return getNode(graph, graph.current);
}

/**
 * Add a state node to the graph.
 * Updates the parent's children array. Does NOT move the current pointer.
 */
export function addNode<State>(graph: ProvenanceGraph<State>, node: StateNode<State>): void {
  const parent = getNode(graph, node.parent);
  graph.nodes.set(node.id, node);
  parent.children.push(node.id);
}

/** Move the current pointer. Throws if node doesn't exist. */
export function setCurrent<State>(graph: ProvenanceGraph<State>, id: NodeId): void {
  getNode(graph, id);
  graph.current = id;
}
