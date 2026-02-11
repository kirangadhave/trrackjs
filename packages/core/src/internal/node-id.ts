import type { NodeId } from './types';

export type GenerateId = () => NodeId;

/** Cast a raw string to NodeId. Used by id generator and deserialization. */
export function nodeId(id: string): NodeId {
  return id as NodeId;
}

/** Default ID generator using crypto.randomUUID. */
export function defaultGenerateId(): NodeId {
  return nodeId(crypto.randomUUID());
}

/**
 * Returns a GenerateId function.
 * Wraps a custom generator to brand its output as NodeId,
 * or falls back to defaultGenerateId.
 */
export function createIdGenerator(custom?: () => string): GenerateId {
  if (custom) {
    return () => nodeId(custom());
  }
  return defaultGenerateId;
}
