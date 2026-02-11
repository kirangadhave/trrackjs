/**
 * @trrack/core - Reproducible provenance tracking for web applications
 *
 * @packageDocumentation
 */

export const VERSION = '2.0.0-alpha.0';

// Internal types
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
  TrrackCoreConfig,
} from './internal';

// Public API types
export type { Trrack, TrrackCore, TrrackAction, ActionConfig } from './types';

// Functions
export { nodeId, isRootNode, isStateNode } from './internal';
export { CheckpointStrategy, DEFAULT_MAX_CHAIN_LENGTH, DEFAULT_MAX_PATCH_COUNT } from './internal';
export { resolveState, produceNextState } from './internal';
export { createTrrackCore } from './internal';
