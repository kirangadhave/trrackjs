import { describe, expect, it } from 'vitest';
import { CheckpointStrategy } from '../../src/internal';
import type { CheckpointFn } from '../../src/internal';
import type { TestState } from '../fixtures/common';
import {
  makeCore,
  makeCoreAlwaysCheckpoint,
  makeCoreNeverCheckpoint,
  registerAdd,
  registerIncrement,
} from '../fixtures/trrack-core';

describe('createTrrackCore', () => {
  it('creates core with correct initial state', () => {
    const core = makeCore();
    expect(core.currentState()).toEqual({ count: 0 });
    expect(core.initialState()).toEqual({ count: 0 });
  });

  it('graph has a root node', () => {
    const core = makeCore();
    const root = core.root();
    expect(root.type).toBe('root');
    expect(root.state.type).toBe('checkpoint');
    expect(root.state.value).toEqual({ count: 0 });
  });

  it('current starts at root', () => {
    const core = makeCore();
    expect(core.current().id).toBe(core.root().id);
  });
});

describe('getState', () => {
  it('returns initial state before any apply', () => {
    const core = makeCore();
    expect(core.getState()).toEqual({ count: 0 });
  });

  it('resolves specific node state by id', () => {
    const core = makeCoreAlwaysCheckpoint();
    const inc = registerIncrement(core);

    core.apply(inc);
    const firstId = core.current().id;
    core.apply(inc);

    expect(core.getState(firstId)).toEqual({ count: 1 });
    expect(core.getState()).toEqual({ count: 2 });
  });
});

describe('register + apply', () => {
  it('creates node, updates current and state', () => {
    const core = makeCore();
    const inc = registerIncrement(core);

    core.apply(inc);

    expect(core.currentState()).toEqual({ count: 1 });
    expect(core.current().type).toBe('state');
    expect(core.current().label).toBe('Increment');
    expect(core.current().event).toBe('increment');
  });

  it('action with args', () => {
    const core = makeCore();
    const add = registerAdd(core);

    core.apply(add, 5);
    expect(core.currentState()).toEqual({ count: 5 });

    core.apply(add, 3);
    expect(core.currentState()).toEqual({ count: 8 });
  });

  it('LabelLike function receives correct context', () => {
    const core = makeCore();
    const inc = core.register('increment', {
      label: ({ newState, previousState }) => `${previousState.count} → ${newState.count}`,
      recipe: (draft) => {
        draft.count += 1;
      },
    });

    core.apply(inc);
    expect(core.current().label).toBe('0 → 1');

    core.apply(inc);
    expect(core.current().label).toBe('1 → 2');
  });

  it('throws on duplicate registration', () => {
    const core = makeCore();
    registerIncrement(core);

    expect(() =>
      core.register('increment', {
        label: 'Inc2',
        recipe: (draft) => {
          draft.count += 2;
        },
      }),
    ).toThrow('Action already registered');
  });

  it('throws on unregistered action', () => {
    const core = makeCore();
    // biome-ignore lint/suspicious/noExplicitAny: testing runtime guard
    const fake = { event: 'nope' } as any;
    expect(() => core.apply(fake)).toThrow('No action registered');
  });

  it('recipe error propagates, no node created, state unchanged', () => {
    const core = makeCore();
    const bad = core.register('bad', {
      label: 'Bad',
      recipe: () => {
        throw new Error('boom');
      },
    });

    const prevId = core.current().id;
    expect(() => core.apply(bad)).toThrow('boom');
    expect(core.current().id).toBe(prevId);
    expect(core.currentState()).toEqual({ count: 0 });
  });

  it('multiple applies build correct chain', () => {
    const core = makeCore();
    const inc = registerIncrement(core);

    core.apply(inc);
    core.apply(inc);
    core.apply(inc);

    expect(core.currentState()).toEqual({ count: 3 });
    expect(core.root().children).toHaveLength(1);
    expect(core.graph().nodes.size).toBe(4);
  });
});

describe('record', () => {
  it('commits pre-computed state', () => {
    const core = makeCore();
    core.record('manual', 'Manual set', { count: 42 }, [
      { op: 'replace' as const, path: ['count'], value: 42 },
    ]);

    expect(core.currentState()).toEqual({ count: 42 });
    expect(core.current().label).toBe('Manual set');
    expect(core.current().event).toBe('manual');
  });

  it('throws on empty event', () => {
    const core = makeCore();
    expect(() => core.record('', 'label', { count: 1 }, [])).toThrow(
      'event must be a non-empty string',
    );
  });

  it('throws on empty label', () => {
    const core = makeCore();
    expect(() => core.record('event', '', { count: 1 }, [])).toThrow(
      'label must be a non-empty string',
    );
  });
});

describe('checkpoint strategies', () => {
  it('always: stores checkpoint on every node', () => {
    const core = makeCoreAlwaysCheckpoint();
    const inc = registerIncrement(core);

    core.apply(inc);
    core.apply(inc);

    for (const node of core.graph().nodes.values()) {
      expect(node.state.type).toBe('checkpoint');
    }
  });

  it('never: stores patches on every non-root node', () => {
    const core = makeCoreNeverCheckpoint();
    const inc = registerIncrement(core);

    core.apply(inc);
    core.apply(inc);

    expect(core.root().state.type).toBe('checkpoint');
    for (const node of core.graph().nodes.values()) {
      if (node.type === 'state') {
        expect(node.state.type).toBe('patch');
      }
    }
  });

  it('threshold: triggers checkpoint at boundary', () => {
    const core = makeCore({
      checkpoint: CheckpointStrategy.threshold({ maxChainLength: 3 }) as CheckpointFn<TestState>,
    });
    const inc = registerIncrement(core);

    core.apply(inc);
    core.apply(inc);
    core.apply(inc);

    const stateNodes = [...core.graph().nodes.values()].filter((n) => n.type === 'state');
    expect(stateNodes).toHaveLength(3);
    expect(stateNodes[0]?.state.type).toBe('patch');
    expect(stateNodes[1]?.state.type).toBe('patch');
    expect(stateNodes[2]?.state.type).toBe('checkpoint');
  });
});

describe('setCurrent', () => {
  it('moves pointer and updates currentState', () => {
    const core = makeCoreAlwaysCheckpoint();
    const inc = registerIncrement(core);

    core.apply(inc);
    const firstId = core.current().id;
    core.apply(inc);

    expect(core.currentState()).toEqual({ count: 2 });

    core.setCurrent(firstId);
    expect(core.currentState()).toEqual({ count: 1 });
    expect(core.current().id).toBe(firstId);
  });

  it('setCurrent to root resets state', () => {
    const core = makeCore();
    const inc = registerIncrement(core);

    core.apply(inc);
    core.apply(inc);
    core.setCurrent(core.root().id);

    expect(core.currentState()).toEqual({ count: 0 });
  });
});
