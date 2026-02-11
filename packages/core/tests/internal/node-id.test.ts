import { createIdGenerator, defaultGenerateId, nodeId } from '../../src/internal';

describe('nodeId', () => {
  it('casts a string to NodeId', () => {
    const id = nodeId('test-id');
    expect(id).toBe('test-id');
    expect(typeof id).toBe('string');
  });
});

describe('defaultGenerateId', () => {
  it('returns a valid UUID string', () => {
    const id = defaultGenerateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => defaultGenerateId()));
    expect(ids.size).toBe(100);
  });
});

describe('createIdGenerator', () => {
  it('falls back to defaultGenerateId when no custom fn', () => {
    const generate = createIdGenerator();
    const id = generate();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('uses custom generator and brands output', () => {
    let counter = 0;
    const generate = createIdGenerator(() => `custom-${++counter}`);

    expect(generate()).toBe('custom-1');
    expect(generate()).toBe('custom-2');
  });
});
