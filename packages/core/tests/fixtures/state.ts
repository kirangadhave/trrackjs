import type { Draft } from 'mutative';
import { produceNextState } from '../../src/internal';
import type { NodeId, StateNode } from '../../src/internal';

/**
 * Create a StateNode with checkpoint storage.
 */
export function makeCheckpointNode<State>(opts: {
  id: NodeId;
  parent: NodeId;
  value: State;
  label?: string;
  event?: string;
}): StateNode<State> {
  return {
    id: opts.id,
    type: 'state',
    label: opts.label ?? 'Checkpoint',
    event: opts.event ?? 'checkpoint',
    createdAt: Date.now(),
    children: [],
    ext: {},
    parent: opts.parent,
    state: { type: 'checkpoint', value: opts.value },
  };
}

/**
 * Create a StateNode with patch storage by running a recipe against a base state.
 */
export function makePatchNode<State>(opts: {
  id: NodeId;
  parent: NodeId;
  checkpointRef: NodeId;
  chainLength: number;
  baseState: State;
  recipe: (draft: Draft<State>) => void;
  label?: string;
  event?: string;
}): StateNode<State> {
  const { patches } = produceNextState(opts.baseState, opts.recipe);

  return {
    id: opts.id,
    type: 'state',
    label: opts.label ?? 'Patch',
    event: opts.event ?? 'patch',
    createdAt: Date.now(),
    children: [],
    ext: {},
    parent: opts.parent,
    state: {
      type: 'patch',
      patches,
      checkpointRef: opts.checkpointRef,
      chainLength: opts.chainLength,
    },
  };
}
