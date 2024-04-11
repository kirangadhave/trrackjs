/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { castDraft, castImmutable, produce } from 'immer';
import { TrrackGraph } from './types';
import {
  ChildNode,
  NodeId,
  RootNodeCreationOpts,
  TrrackNode,
  createRootNode,
} from '../nodes';

export type TrrackGraphCreationOpts<Metadata extends {} = {}> = Partial<{
  root: RootNodeCreationOpts<Metadata>;
}>;

export function createTrrackGraph<State, Metadata extends {} = {}>(
  initialState: State,
  opts?: TrrackGraphCreationOpts<Metadata>
): TrrackGraph<State, Metadata> {
  const root = createRootNode(initialState, opts?.root);

  const graph: TrrackGraph<State, Metadata> = {
    nodes: {
      [root.id]: castDraft(root),
    },
    current: root.id,
    root: root.id,
  };

  return graph;
}

export function addNode<State, Metadata extends {} = {}>(
  graph: TrrackGraph<State, Metadata>,
  node: ChildNode<State, Metadata>
): TrrackGraph<State, Metadata> {
  return produce(graph, (draft) => {
    if (!draft.nodes[node.parent]) {
      throw new Error('Parent node does not exist');
    }

    draft.nodes[node.id] = castDraft(castImmutable(node));
    draft.nodes[node.parent].children.push(node.id);
    draft.current = node.id;
  });
}

export function setCurrentNode<State, Metadata extends {} = {}>(
  graph: TrrackGraph<State, Metadata>,
  node: NodeId | ChildNode<State, Metadata>
): TrrackGraph<State, Metadata> {
  return produce(graph, (draft) => {
    draft.current = typeof node === 'string' ? node : node.id;
  });
}

export function addMetadata<State, Metadata extends {} = {}>(
  graph: TrrackGraph<State, Metadata>,
  metadata: Metadata
): TrrackGraph<State, Metadata> {
  return produce(graph, (draft) => {
    const previousMetadata = draft.nodes[draft.current].metadata;
    
    draft.nodes[draft.current].metadata = {
      ...previousMetadata,
      ...metadata,
    };
  });
}
)