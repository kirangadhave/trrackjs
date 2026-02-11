import type { CheckpointContext } from '../../src/internal';
import type { TestState } from './common';

export function makeCheckpointCtx(
  overrides: Partial<CheckpointContext<TestState>> = {},
): CheckpointContext<TestState> {
  return {
    chainLength: 0,
    cumulativePatchCount: 0,
    patches: [],
    newState: { count: 1 },
    previousState: { count: 0 },
    ...overrides,
  };
}
