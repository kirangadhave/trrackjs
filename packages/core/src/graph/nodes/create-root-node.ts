import { ID } from '../../utils';
import { NodeMetadata, RootNode } from './types';

export const DEFAULT_ROOT_LABEL = 'Root';

export function createRootNode<State>(args: {
    state: State;
    initialMetadata?: Record<string, unknown>;
    initialArtifact?: unknown;
    label?: string;
}): RootNode<State> {
    const {
        label = DEFAULT_ROOT_LABEL,
        state,
        initialArtifact,
        initialMetadata,
    } = args;

    const commonMetadata: NodeMetadata = {
        annotation: [],
        bookmark: [],
    };

    const meta = Object.keys(initialMetadata || {}).reduce<NodeMetadata>(
        (acc: NodeMetadata, key) => {
            acc[key] = [];
            if (initialMetadata && initialMetadata[key]) {
                acc[key].push({
                    type: key,
                    id: ID.get(),
                    val: initialMetadata[key],
                    createdOn: Date.now(),
                });
            }
            return acc;
        },
        commonMetadata
    );

    const artifacts = initialArtifact
        ? [
              {
                  id: ID.get(),
                  createdOn: Date.now(),
                  val: initialArtifact,
              },
          ]
        : [];

    return {
        id: ID.get(),
        label,
        event: 'Root',
        children: [],
        level: 0,
        createdOn: Date.now(),
        meta,
        artifacts,
        state: {
            type: 'checkpoint',
            val: state,
        },
    };
}
