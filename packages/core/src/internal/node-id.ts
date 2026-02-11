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

/** Wraps a custom string generator to produce branded NodeIds, or falls back to default. */
export function createIdGenerator(custom?: () => string): GenerateId {
  if (!custom) return defaultGenerateId;
  return () => nodeId(custom());
}
