import { type NodeId, createNodeId } from "./id";
import type { Checkpoint, StateLike } from "./storage";

type BaseNode<State> = {
	id: NodeId;
	state: StateLike<State>;
	label: string;
	children: Array<NodeId>;
	createdOn: number;
};

export type RootNode<State> = BaseNode<State> & {
	type: "root";
	level: 0;
	state: Checkpoint<State>;
};

export type StateNode<State> = BaseNode<State> & {
	type: "state";
	level: number;
	parent: NodeId;
};

export type TrrackNode<State> = RootNode<State> | StateNode<State>;

export function isRootNode<State>(node: TrrackNode<State>): node is RootNode<State> {
	return node.type === "root";
}

export function isStateNode<State>(node: TrrackNode<State>): node is StateNode<State> {
	return node.type === "state";
}

export function createRootNode<State>(state: State, label = "Root"): RootNode<State> {
	return {
		id: createNodeId(),
		type: "root",
		level: 0,
		label,
		children: [],
		state: { type: "checkpoint", value: state },
		createdOn: Date.now(),
	};
}

export function createStateNode<State>(opts: {
	parent: NodeId;
	level: number;
	label: string;
	state: StateLike<State>;
}): StateNode<State> {
	return {
		id: createNodeId(),
		type: "state",
		level: opts.level,
		label: opts.label,
		parent: opts.parent,
		children: [],
		state: opts.state,
		createdOn: Date.now(),
	};
}
