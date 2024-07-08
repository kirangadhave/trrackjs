import { ID } from '../../utils';
import {
    ProvenanceNode,
    StateLike,
    SideEffects,
    StateNode,
    NodeMetadata,
} from './types';

export function createStateNode<State, Event extends string>({
    parent,
    state,
    label,
    sideEffects = {
        do: [],
        undo: [],
    },
    initialMetadata,
    initialArtifact,
    event,
}: {
    parent: ProvenanceNode<State, Event>;
    state: StateLike<State>;
    initialMetadata?: Record<string, unknown>;
    initialArtifact?: unknown;
    label: string;
    sideEffects?: SideEffects;
    event: Event;
}): StateNode<State, Event> {
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
        event,
        children: [],
        parent: parent.id,
        createdOn: Date.now(),
        meta,
        artifacts,
        sideEffects,
        state,
        level: parent.level + 1,
    };
}
