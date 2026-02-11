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
} from './internal';

// Functions
export { nodeId, isRootNode, isStateNode } from './internal';
