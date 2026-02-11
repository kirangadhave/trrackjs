import { create, apply as mutativeApply } from 'mutative';
import type { Draft, Patch } from 'mutative';
import { getNode } from './graph';
import { isStateNode } from './guards';
import type { NodeId, ProvenanceGraph } from './types';

// --- State Resolution ---

/**
 * Resolve the full state for a given node.
 *
 * - Checkpoint nodes: return the stored value directly.
 * - Patch nodes: walk from the node back to its checkpoint ancestor,
 *   collect patches in ancestor→descendant order, then apply sequentially.
 */
export function resolveState<State>(graph: ProvenanceGraph<State>, nodeId: NodeId): State {
  // Collect patch arrays from this node back to the nearest checkpoint, then reverse for correct order
  const chain: Patch[][] = [];
  let cursor = getNode(graph, nodeId);

  while (isStateNode<State>(cursor) && cursor.state.type === 'patch') {
    chain.push(cursor.state.patches);
    cursor = getNode(graph, cursor.parent);
  }

  // cursor is now the checkpoint node — narrow to checkpoint storage
  if (cursor.state.type !== 'checkpoint') {
    throw new Error(`Expected checkpoint node, got patch node: ${cursor.id}`);
  }

  chain.reverse();

  let state = cursor.state.value as object;
  for (const patches of chain) {
    state = mutativeApply(state, patches);
  }

  return state as State;
}

// --- Produce with Patches ---

/** Result of producing a new state with Mutative. */
export interface ProduceResult<State> {
  newState: State;
  patches: Patch[];
}

/**
 * Produce the next state from a recipe using Mutative.
 * Returns the new state and forward patches (inverse patches discarded).
 */
export function produceNextState<State>(
  currentState: State,
  recipe: (draft: Draft<State>) => void,
): ProduceResult<State> {
  const [newState, patches] = create(currentState, recipe, { enablePatches: true });

  return { newState, patches };
}
