/* eslint-disable @typescript-eslint/ban-types */
import { Immutable } from 'immer';
import { NodeId, TrrackNodes } from '../nodes';

export type TrrackGraph<State, Metadata = {}> = Immutable<{
  nodes: TrrackNodes<State, Metadata>;
  current: NodeId;
  root: NodeId;
}>;
