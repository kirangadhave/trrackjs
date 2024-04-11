import { v4 as uuid } from 'uuid';
import { NodeId } from '../nodes';

export function getNodeId(): NodeId {
  return uuid();
}
