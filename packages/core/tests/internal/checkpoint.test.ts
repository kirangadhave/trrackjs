import type { CheckpointFn } from '../../src/internal';
import {
  CheckpointStrategy,
  DEFAULT_MAX_CHAIN_LENGTH,
  DEFAULT_MAX_PATCH_COUNT,
} from '../../src/internal';
import { makeCheckpointCtx } from '../fixtures/checkpoint';
import type { TestState } from '../fixtures/nodes';

describe('CheckpointStrategy.always', () => {
  it('always returns true', () => {
    expect(CheckpointStrategy.always(makeCheckpointCtx())).toBe(true);
    expect(CheckpointStrategy.always(makeCheckpointCtx({ chainLength: 0 }))).toBe(true);
  });

  it('is assignable to CheckpointFn<T>', () => {
    const fn: CheckpointFn<TestState> = CheckpointStrategy.always;
    expect(fn(makeCheckpointCtx())).toBe(true);
  });
});

describe('CheckpointStrategy.never', () => {
  it('always returns false', () => {
    expect(CheckpointStrategy.never(makeCheckpointCtx())).toBe(false);
    expect(CheckpointStrategy.never(makeCheckpointCtx({ chainLength: 100 }))).toBe(false);
  });
});

describe('CheckpointStrategy.threshold', () => {
  it('uses default thresholds', () => {
    const fn = CheckpointStrategy.threshold();

    expect(fn(makeCheckpointCtx({ chainLength: DEFAULT_MAX_CHAIN_LENGTH - 1 }))).toBe(false);
    expect(fn(makeCheckpointCtx({ chainLength: DEFAULT_MAX_CHAIN_LENGTH }))).toBe(true);

    expect(fn(makeCheckpointCtx({ cumulativePatchCount: DEFAULT_MAX_PATCH_COUNT - 1 }))).toBe(
      false,
    );
    expect(fn(makeCheckpointCtx({ cumulativePatchCount: DEFAULT_MAX_PATCH_COUNT }))).toBe(true);
  });

  it('respects custom maxChainLength', () => {
    const fn = CheckpointStrategy.threshold({ maxChainLength: 5 });

    expect(fn(makeCheckpointCtx({ chainLength: 4 }))).toBe(false);
    expect(fn(makeCheckpointCtx({ chainLength: 5 }))).toBe(true);
  });

  it('respects custom maxPatchCount', () => {
    const fn = CheckpointStrategy.threshold({ maxPatchCount: 20 });

    expect(fn(makeCheckpointCtx({ cumulativePatchCount: 19 }))).toBe(false);
    expect(fn(makeCheckpointCtx({ cumulativePatchCount: 20 }))).toBe(true);
  });

  it('triggers on either threshold', () => {
    const fn = CheckpointStrategy.threshold({ maxChainLength: 5, maxPatchCount: 20 });

    expect(fn(makeCheckpointCtx({ chainLength: 4, cumulativePatchCount: 19 }))).toBe(false);
    expect(fn(makeCheckpointCtx({ chainLength: 5, cumulativePatchCount: 0 }))).toBe(true);
    expect(fn(makeCheckpointCtx({ chainLength: 0, cumulativePatchCount: 20 }))).toBe(true);
  });
});
