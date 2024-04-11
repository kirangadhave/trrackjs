/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { getDateTime } from '../../utils/datetime';
import { SPEC_VERSION } from '../../version';
import { TrrackGraph } from '../graph';
import { getNodeHash } from '../utils/hasher';
import { getNodeId } from '../utils/nodeId';
import { ChildNode, NodeId } from './types';

export type ChildNodeCreationOpts<Metadata extends {} = {}> = Partial<{
  author: string;
  label: string;
  type: string;
  metadata: Metadata;
}>;

export function createChildNode<State, Metadata extends {} = {}>(
  graph: TrrackGraph<State, Metadata>,
  parentId: string,
  payload: ChildNode<State, Metadata>['payload'],
  opts: ChildNodeCreationOpts<Metadata> = {} as Metadata
): ChildNode<State, Metadata> {
  const parentNode = graph.nodes[parentId];
  if (!parentNode) {
    throw new Error('Parent node does not exist');
  }

  const {
    author = 'unknown',
    label = 'Child Node',
    type = 'action',
    metadata = {},
  } = opts;

  const parentHash = parentNode.hash;
  const id = getNodeId();
  const hash = getNodeHash(id, parentHash);

  const child: ChildNode<State, Metadata> = {
    id,
    hash,
    __root: false,
    __nodeType: payload.type,
    label,
    type,
    parent: parentId,
    payload: payload as any,
    metadata: {
      createdOn: getDateTime(),
      specVersion: SPEC_VERSION,
      author,
      ...(metadata as Metadata),
    },
    children: [] as NodeId[],
  };

  return child;
}
