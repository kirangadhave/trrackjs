/**
 * @trrack/core - Reproducible provenance tracking for web applications
 *
 * @packageDocumentation
 */

export const VERSION = '2.0.0-alpha.0';

// Types
export type {
  Patch,
  NodeId,
  CheckpointStorage,
  PatchStorage,
  StateStorage,
  RootNode,
  StateNode,
  ProvenanceNode,
  ProvenanceGraph,
  CheckpointContext,
  CheckpointConfig,
  CheckpointFn,
  LabelLike,
  ProduceResult,
} from './internal';

// Functions
export { nodeId, isRootNode, isStateNode } from './internal';
export { CheckpointStrategy, DEFAULT_MAX_CHAIN_LENGTH, DEFAULT_MAX_PATCH_COUNT } from './internal';
export { resolveState, produceNextState } from './internal';
