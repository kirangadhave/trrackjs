import type { Patch } from 'mutative';
import type { ActionConfig, TrrackAction, TrrackCore } from '../types';
import { CheckpointStrategy } from './checkpoint';
import type { CheckpointContext, CheckpointFn } from './checkpoint';
import {
  addNode,
  createGraph,
  getCurrent,
  getNode,
  getRoot,
  setCurrent as graphSetCurrent,
} from './graph';
import { isStateNode } from './guards';
import { produceNextState, resolveState } from './state';
import type {
  LabelLike,
  NodeId,
  ProvenanceGraph,
  ProvenanceNode,
  StateNode,
  StateStorage,
} from './types';

// --- Config ---

export interface TrrackCoreConfig<State> {
  initialState: State;
  /** Checkpoint strategy function. Default: `CheckpointStrategy.threshold()` */
  checkpoint?: CheckpointFn<State>;
  /** Custom ID generator. Default: `crypto.randomUUID()` */
  generateId?: () => string;
  rootLabel?: string;
}

// --- Pure helpers ---

function resolveLabel<State>(
  label: LabelLike<State>,
  newState: State,
  previousState: State,
): string {
  return typeof label === 'function' ? label({ newState, previousState }) : label;
}

function computeChainInfo<State>(
  graph: ProvenanceGraph<State>,
  parentNode: ProvenanceNode<State>,
): {
  chainLength: number;
  cumulativePatchCount: number;
  checkpointRef: NodeId;
} {
  if (parentNode.state.type === 'checkpoint') {
    return { chainLength: 0, cumulativePatchCount: 0, checkpointRef: parentNode.id };
  }

  let cumulativePatchCount = 0;
  let cursor: ProvenanceNode<State> = parentNode;
  while (isStateNode<State>(cursor) && cursor.state.type === 'patch') {
    cumulativePatchCount += cursor.state.patches.length;
    cursor = getNode(graph, cursor.parent);
  }

  return {
    chainLength: parentNode.state.chainLength,
    cumulativePatchCount,
    checkpointRef: parentNode.state.checkpointRef,
  };
}

function buildStorage<State>(
  shouldCheckpoint: boolean,
  newState: State,
  patches: Patch[],
  chainInfo: { chainLength: number; checkpointRef: NodeId },
): StateStorage<State> {
  if (shouldCheckpoint) {
    return { type: 'checkpoint', value: newState };
  }
  return {
    type: 'patch',
    patches,
    checkpointRef: chainInfo.checkpointRef,
    chainLength: chainInfo.chainLength + 1,
  };
}

// --- Factory ---

export function createTrrackCore<State>(config: TrrackCoreConfig<State>): TrrackCore<State> {
  const { initialState } = config;
  const checkpointFn = config.checkpoint ?? (CheckpointStrategy.threshold() as CheckpointFn<State>);
  const { graph, generateId } = createGraph<State>({
    initialState,
    rootLabel: config.rootLabel,
    generateId: config.generateId,
  });

  let _currentState: State = initialState;

  // biome-ignore lint/suspicious/noExplicitAny: registry erases Args type at storage boundary
  const registry = new Map<string, ActionConfig<State, any[]>>();

  function record(event: string, label: string, newState: State, patches: Patch[]): void {
    if (!event) throw new Error('event must be a non-empty string');
    if (!label) throw new Error('label must be a non-empty string');

    const parentNode = getCurrent(graph);
    const chainInfo = computeChainInfo(graph, parentNode);

    const ctx: CheckpointContext<State> = {
      chainLength: chainInfo.chainLength + 1,
      cumulativePatchCount: chainInfo.cumulativePatchCount + patches.length,
      patches,
      newState,
      previousState: _currentState,
    };

    const storage = buildStorage(checkpointFn(ctx), newState, patches, chainInfo);

    const node: StateNode<State> = {
      id: generateId(),
      type: 'state',
      label,
      event,
      createdAt: Date.now(),
      children: [],
      ext: {},
      parent: graph.current,
      state: storage,
    };

    addNode(graph, node);
    graphSetCurrent(graph, node.id);
    _currentState = newState;
  }

  function register<Args extends unknown[]>(
    event: string,
    actionConfig: ActionConfig<State, Args>,
  ): TrrackAction<Args> {
    if (registry.has(event)) throw new Error(`Action already registered for event: ${event}`);
    registry.set(event, actionConfig);
    return { event } as TrrackAction<Args>;
  }

  function apply<Args extends unknown[]>(action: TrrackAction<Args>, ...args: Args): void {
    const entry = registry.get(action.event);
    if (!entry) throw new Error(`No action registered for event: ${action.event}`);

    const previousState = _currentState;
    const { newState, patches } = produceNextState(previousState, (draft) => {
      entry.recipe(draft, ...args);
    });

    const label = resolveLabel(entry.label, newState, previousState);
    if (!label) throw new Error('label must resolve to a non-empty string');

    record(action.event, label, newState, patches);
  }

  function _getState(): State;
  function _getState(id: NodeId): State;
  function _getState(id?: NodeId): State {
    return id === undefined ? _currentState : resolveState(graph, id);
  }

  function setCurrent(id: NodeId): void {
    graphSetCurrent(graph, id);
    _currentState = resolveState(graph, id);
  }

  return {
    graph: () => graph,
    generateId,
    initialState: () => initialState,
    currentState: () => _currentState,
    current: () => getCurrent(graph),
    root: () => getRoot(graph),
    register,
    apply,
    record,
    getState: _getState,
    getNode: (id: NodeId) => getNode(graph, id),
    setCurrent,
  };
}
