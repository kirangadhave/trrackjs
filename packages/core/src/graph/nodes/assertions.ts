import { ProvenanceNode, StateNode, RootNode } from './types';

export function isStateNode<State, Event extends string>(
    node: ProvenanceNode<State, Event>
): node is StateNode<State, Event> {
    return 'parent' in node;
}

export function isRootNode<State, Event extends string>(
    node: ProvenanceNode<State, Event>
): node is RootNode<State> {
    return !isStateNode(node);
}
