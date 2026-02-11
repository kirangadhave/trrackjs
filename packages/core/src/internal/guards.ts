import type { ProvenanceNode, RootNode, StateNode } from './types';

export function isRootNode<State>(node: ProvenanceNode<State>): node is RootNode<State> {
  return node.type === 'root';
}

export function isStateNode<State>(node: ProvenanceNode<State>): node is StateNode<State> {
  return node.type === 'state';
}
