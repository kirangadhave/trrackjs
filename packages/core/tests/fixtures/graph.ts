import type { TrrackGraph } from "../../src/types/graph";
import type { NodeId } from "../../src/types/id";
import type { TrrackNode } from "../../src/types/node";

/** Get a node from the graph, throwing if not found. Avoids non-null assertions in tests. */
export function getNode<State>(graph: TrrackGraph<State>, id: NodeId): TrrackNode<State> {
	const node = graph.nodes.get(id);
	if (!node) throw new Error(`Node ${id} not found`);
	return node;
}
