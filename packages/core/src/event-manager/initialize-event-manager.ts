import { EventManager, ListenerFn } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function initEventManager(): EventManager {
    const eventsMap = new Map<string, Set<ListenerFn>>();

    return {
        listen(event, listener) {
            if (!eventsMap.has(event)) {
                const listenerSet = new Set<ListenerFn>();
                eventsMap.set(event, listenerSet);
            }
            eventsMap.get(event)?.add(listener);

            return () => {
                return eventsMap.get(event)?.delete(listener) || false;
            };
        },
        fire(event: string, ...args: any[]) {
            const events = eventsMap.get(event);

            if (events) {
                events.forEach((e) => e(...args));
            }
        },
    };
}
