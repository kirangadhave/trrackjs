import { createTrrackGraph } from '../src';

describe('store', () => {
  it('should create a store', () => {
    const graph = createTrrackGraph({ count: 0 });
    console.log(graph);
  });
});
