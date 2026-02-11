import { nodeId } from '../../src/internal';
import type { RootNode, StateNode } from '../../src/internal';
import type { TestState } from './common';

export const ROOT_ID = nodeId('root');

export function makeRootNode(state: TestState = { count: 0 }): RootNode<TestState> {
  return {
    id: ROOT_ID,
    type: 'root',
    label: 'Root',
    event: 'root',
    createdAt: 0,
    children: [],
    ext: {},
    state: { type: 'checkpoint', value: state },
  };
}

export function makeStateNode(
  overrides: Partial<StateNode<TestState>> & { id: StateNode<TestState>['id'] } = {
    id: nodeId('node-1'),
  },
): StateNode<TestState> {
  return {
    type: 'state',
    label: 'Increment',
    event: 'increment',
    createdAt: Date.now(),
    children: [],
    ext: {},
    parent: ROOT_ID,
    state: { type: 'checkpoint', value: { count: 1 } },
    ...overrides,
  };
}
