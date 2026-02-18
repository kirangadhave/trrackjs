import type { NodeId } from "./id";
import { type TrrackNode, createRootNode, isStateNode } from "./node";

export type TrrackGraph<State> = {
	nodes: Map<NodeId, TrrackNode<State>>;
	current: NodeId;
	root: NodeId;
};

export type CreateTrrackGraphOpts = {
	label?: string;
};

export function createTrrackGraph<State>(
	initialState: State,
	opts: CreateTrrackGraphOpts = {},
): TrrackGraph<State> {
	const { label = "Root" } = opts;

	const rootNode = createRootNode(initialState, label);

	const nodes = new Map<NodeId, TrrackNode<State>>();
	nodes.set(rootNode.id, rootNode);

	return {
		nodes,
		root: rootNode.id,
		current: rootNode.id,
	};
}

export function addNode<State>(graph: TrrackGraph<State>, node: TrrackNode<State>) {
	if (graph.nodes.has(node.id)) {
		throw new Error("Node already exists.");
	}

	if (isStateNode(node)) {
		const parent = graph.nodes.get(node.parent);

		if (!parent) {
			throw new Error("Parent node not found.");
		}

		parent.children.push(node.id);
	}

	graph.nodes.set(node.id, node);
	graph.current = node.id;
}
