import { CheckpointStrategy, createTrrackCore } from '../../src/internal';
import type { CheckpointFn, TrrackCoreConfig } from '../../src/internal';
import type { TrrackCore } from '../../src/types';
import type { TestState } from './common';

export const DEFAULT_INITIAL_STATE: TestState = { count: 0 };

export function makeCore(config?: Partial<TrrackCoreConfig<TestState>>) {
  return createTrrackCore<TestState>({
    initialState: DEFAULT_INITIAL_STATE,
    ...config,
  });
}

export function makeCoreAlwaysCheckpoint(
  config?: Omit<Partial<TrrackCoreConfig<TestState>>, 'checkpoint'>,
) {
  return makeCore({
    ...config,
    checkpoint: CheckpointStrategy.always as CheckpointFn<TestState>,
  });
}

export function makeCoreNeverCheckpoint(
  config?: Omit<Partial<TrrackCoreConfig<TestState>>, 'checkpoint'>,
) {
  return makeCore({
    ...config,
    checkpoint: CheckpointStrategy.never as CheckpointFn<TestState>,
  });
}

export function registerIncrement(core: TrrackCore<TestState>) {
  return core.register('increment', {
    label: 'Increment',
    recipe: (draft) => {
      draft.count += 1;
    },
  });
}

export function registerAdd(core: TrrackCore<TestState>) {
  return core.register('add', {
    label: 'Add',
    recipe: (draft, amount: number) => {
      draft.count += amount;
    },
  });
}
