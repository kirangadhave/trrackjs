import type { Patch } from 'mutative';

// --- Constants ---

export const DEFAULT_MAX_CHAIN_LENGTH = 10;
export const DEFAULT_MAX_PATCH_COUNT = 50;

// --- Types ---

/** Context passed to checkpoint strategy for deciding checkpoint vs patch. */
export interface CheckpointContext<State> {
  /** Number of patch nodes since last checkpoint */
  chainLength: number;
  /** Total patches accumulated in current chain */
  cumulativePatchCount: number;
  /** Mutative patches for this operation */
  patches: Patch[];
  /** The new state (already computed by produce) */
  newState: State;
  /** The previous state (already computed by produce) */
  previousState: State;
}

/** Threshold-based checkpoint config. */
export interface CheckpointConfig {
  maxChainLength?: number;
  maxPatchCount?: number;
}

/** Checkpoint strategy function. Returns `true` if the node should store a full checkpoint. */
export type CheckpointFn<State> = (ctx: CheckpointContext<State>) => boolean;

// --- Built-in strategies ---

export const CheckpointStrategy = {
  /** Always store a full checkpoint (every node). */
  always: (() => true) as CheckpointFn<unknown>,

  /** Never store a checkpoint (only root has one). */
  never: (() => false) as CheckpointFn<unknown>,

  /** Threshold-based strategy. Checkpoints when chain length or cumulative patch count exceeds thresholds. */
  threshold: (config: CheckpointConfig = {}): CheckpointFn<unknown> => {
    const maxChain = config.maxChainLength ?? DEFAULT_MAX_CHAIN_LENGTH;
    const maxPatches = config.maxPatchCount ?? DEFAULT_MAX_PATCH_COUNT;

    return (ctx) => ctx.chainLength >= maxChain || ctx.cumulativePatchCount >= maxPatches;
  },
} as const;
