import type { NodeId } from "../../src/types/id";
import type { Checkpoint, TrrackPatch } from "../../src/types/storage";

export function makeCheckpoint<State>(value: State): Checkpoint<State> {
	return { type: "checkpoint", value };
}

export function makePatchState(
	checkpointRef: NodeId,
	patches: TrrackPatch["patches"] = [],
): TrrackPatch {
	return { type: "patch", checkpointRef, patches };
}
