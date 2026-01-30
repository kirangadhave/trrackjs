/**
 * @trrack/core - Reproducible provenance tracking for web applications
 *
 * @packageDocumentation
 */

export const VERSION = '2.0.0-alpha.0';

export interface TrrackConfig<State> {
  initialState: State;
}

export function createTrrack<State>(config: TrrackConfig<State>) {
  return {
    version: VERSION,
    state: config.initialState,
  };
}
