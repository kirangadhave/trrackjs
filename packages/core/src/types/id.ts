import { nanoid } from "nanoid";

declare const __nodeId: unique symbol;
export type NodeId = string & { readonly [__nodeId]: true };

/**
 *
 * @returns a unique ID string typed as NodeId
 */
export function createNodeId(): NodeId {
	return nanoid() as NodeId;
}
