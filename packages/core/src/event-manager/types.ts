/* eslint-disable @typescript-eslint/no-explicit-any */

export type Unsubscribe = () => boolean;
export type ListenerFn = (...args: any[]) => void;

export type EventManager = {
    listen(event: string, listener: ListenerFn): Unsubscribe;
    fire(event: string, ...args: any[]): void;
};
