'use strict';

var mutative = require('mutative');

// src/internal/node-id.ts
function nodeId(id) {
  return id;
}
function defaultGenerateId() {
  return nodeId(crypto.randomUUID());
}
function createIdGenerator(custom) {
  if (!custom) return defaultGenerateId;
  return () => nodeId(custom());
}

// src/internal/guards.ts
function isRootNode(node) {
  return node.type === "root";
}
function isStateNode(node) {
  return node.type === "state";
}

// src/internal/graph.ts
function createGraph(config) {
  const generateId = createIdGenerator(config.generateId);
  const rootLabel = config.rootLabel ?? "Root";
  const rootId = generateId();
  const rootNode = {
    id: rootId,
    type: "root",
    label: rootLabel,
    event: "root",
    createdAt: Date.now(),
    children: [],
    ext: {},
    state: {
      type: "checkpoint",
      value: config.initialState
    }
  };
  const graph = {
    nodes: /* @__PURE__ */ new Map([[rootId, rootNode]]),
    root: rootId,
    current: rootId,
    ext: {}
  };
  return { graph, generateId };
}
function getNode(graph, id) {
  const node = graph.nodes.get(id);
  if (!node) {
    throw new Error(`Node not found: ${id}`);
  }
  return node;
}
function getRoot(graph) {
  return getNode(graph, graph.root);
}
function getCurrent(graph) {
  return getNode(graph, graph.current);
}
function addNode(graph, node) {
  const parent = getNode(graph, node.parent);
  graph.nodes.set(node.id, node);
  parent.children.push(node.id);
}
function setCurrent(graph, id) {
  getNode(graph, id);
  graph.current = id;
}

// src/internal/checkpoint.ts
var DEFAULT_MAX_CHAIN_LENGTH = 10;
var DEFAULT_MAX_PATCH_COUNT = 50;
var CheckpointStrategy = {
  /** Always store a full checkpoint (every node). */
  always: (() => true),
  /** Never store a checkpoint (only root has one). */
  never: (() => false),
  /** Threshold-based strategy. Checkpoints when chain length or cumulative patch count exceeds thresholds. */
  threshold: (config = {}) => {
    const maxChain = config.maxChainLength ?? DEFAULT_MAX_CHAIN_LENGTH;
    const maxPatches = config.maxPatchCount ?? DEFAULT_MAX_PATCH_COUNT;
    return (ctx) => ctx.chainLength >= maxChain || ctx.cumulativePatchCount >= maxPatches;
  }
};
function resolveState(graph, nodeId2) {
  const chain = [];
  let cursor = getNode(graph, nodeId2);
  while (isStateNode(cursor) && cursor.state.type === "patch") {
    chain.push(cursor.state.patches);
    cursor = getNode(graph, cursor.parent);
  }
  if (cursor.state.type !== "checkpoint") {
    throw new Error(`Expected checkpoint node, got patch node: ${cursor.id}`);
  }
  chain.reverse();
  let state = cursor.state.value;
  for (const patches of chain) {
    state = mutative.apply(state, patches);
  }
  return state;
}
function produceNextState(currentState, recipe) {
  const [newState, patches] = mutative.create(currentState, recipe, { enablePatches: true });
  return { newState, patches };
}

// src/internal/trrack-core.ts
function resolveLabel(label, newState, previousState) {
  return typeof label === "function" ? label({ newState, previousState }) : label;
}
function computeChainInfo(graph, parentNode) {
  if (parentNode.state.type === "checkpoint") {
    return { chainLength: 0, cumulativePatchCount: 0, checkpointRef: parentNode.id };
  }
  let cumulativePatchCount = 0;
  let cursor = parentNode;
  while (isStateNode(cursor) && cursor.state.type === "patch") {
    cumulativePatchCount += cursor.state.patches.length;
    cursor = getNode(graph, cursor.parent);
  }
  return {
    chainLength: parentNode.state.chainLength,
    cumulativePatchCount,
    checkpointRef: parentNode.state.checkpointRef
  };
}
function buildStorage(shouldCheckpoint, newState, patches, chainInfo) {
  if (shouldCheckpoint) {
    return { type: "checkpoint", value: newState };
  }
  return {
    type: "patch",
    patches,
    checkpointRef: chainInfo.checkpointRef,
    chainLength: chainInfo.chainLength + 1
  };
}
function createTrrackCore(config) {
  const { initialState } = config;
  const checkpointFn = config.checkpoint ?? CheckpointStrategy.threshold();
  const { graph, generateId } = createGraph({
    initialState,
    rootLabel: config.rootLabel,
    generateId: config.generateId
  });
  let _currentState = initialState;
  const registry = /* @__PURE__ */ new Map();
  function record(event, label, newState, patches) {
    if (!event) throw new Error("event must be a non-empty string");
    if (!label) throw new Error("label must be a non-empty string");
    const parentNode = getCurrent(graph);
    const chainInfo = computeChainInfo(graph, parentNode);
    const ctx = {
      chainLength: chainInfo.chainLength + 1,
      cumulativePatchCount: chainInfo.cumulativePatchCount + patches.length,
      patches,
      newState,
      previousState: _currentState
    };
    const storage = buildStorage(checkpointFn(ctx), newState, patches, chainInfo);
    const node = {
      id: generateId(),
      type: "state",
      label,
      event,
      createdAt: Date.now(),
      children: [],
      ext: {},
      parent: graph.current,
      state: storage
    };
    addNode(graph, node);
    setCurrent(graph, node.id);
    _currentState = newState;
  }
  function register(event, actionConfig) {
    if (registry.has(event)) throw new Error(`Action already registered for event: ${event}`);
    registry.set(event, actionConfig);
    return { event };
  }
  function apply(action, ...args) {
    const entry = registry.get(action.event);
    if (!entry) throw new Error(`No action registered for event: ${action.event}`);
    const previousState = _currentState;
    const { newState, patches } = produceNextState(previousState, (draft) => {
      entry.recipe(draft, ...args);
    });
    const label = resolveLabel(entry.label, newState, previousState);
    if (!label) throw new Error("label must resolve to a non-empty string");
    record(action.event, label, newState, patches);
  }
  function _getState(id) {
    return id === void 0 ? _currentState : resolveState(graph, id);
  }
  function setCurrent2(id) {
    setCurrent(graph, id);
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
    getNode: (id) => getNode(graph, id),
    setCurrent: setCurrent2
  };
}

// src/index.ts
var VERSION = "2.0.0-alpha.0";

exports.CheckpointStrategy = CheckpointStrategy;
exports.DEFAULT_MAX_CHAIN_LENGTH = DEFAULT_MAX_CHAIN_LENGTH;
exports.DEFAULT_MAX_PATCH_COUNT = DEFAULT_MAX_PATCH_COUNT;
exports.VERSION = VERSION;
exports.createTrrackCore = createTrrackCore;
exports.isRootNode = isRootNode;
exports.isStateNode = isStateNode;
exports.nodeId = nodeId;
exports.produceNextState = produceNextState;
exports.resolveState = resolveState;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map