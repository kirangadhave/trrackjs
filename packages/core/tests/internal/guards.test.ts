import { isRootNode, isStateNode, nodeId } from '../../src/internal';
import { makeRootNode, makeStateNode } from '../fixtures/nodes';

describe('isRootNode', () => {
  it('returns true for root node', () => {
    expect(isRootNode(makeRootNode())).toBe(true);
  });

  it('returns false for state node', () => {
    expect(isRootNode(makeStateNode({ id: nodeId('n1') }))).toBe(false);
  });

  it('narrows type to RootNode', () => {
    const node = makeRootNode();
    if (isRootNode(node)) {
      expect(node.state.type).toBe('checkpoint');
      expect(node.event).toBe('root');
    }
  });
});

describe('isStateNode', () => {
  it('returns true for state node', () => {
    expect(isStateNode(makeStateNode({ id: nodeId('n1') }))).toBe(true);
  });

  it('returns false for root node', () => {
    expect(isStateNode(makeRootNode())).toBe(false);
  });

  it('narrows type to StateNode', () => {
    const node = makeStateNode({ id: nodeId('n1') });
    if (isStateNode(node)) {
      expect(node.parent).toBe('root');
    }
  });
});
