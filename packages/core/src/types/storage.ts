import type { Patch } from "mutative";
import type { NodeId } from "./id";

export type Checkpoint<State> = {
	type: "checkpoint";
	value: State;
};

export type TrrackPatch = {
	type: "patch";
	checkpointRef: NodeId;
	patches: Patch[];
};

export type StateLike<State> = Checkpoint<State> | TrrackPatch;

export function isCheckpoint<State>(stateLike: StateLike<State>): stateLike is Checkpoint<State> {
	return stateLike.type === "checkpoint";
}

export function isTrrackPatch(stateLike: StateLike<unknown>): stateLike is TrrackPatch {
	return stateLike.type === "patch";
}
