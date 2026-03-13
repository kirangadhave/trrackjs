import { v4 as uuid } from 'uuid';

/**
 * Type to add branding flavor
 */
type Flavoring<TFlavor> = {
  _type?: TFlavor;
};

//'https://spin.atomicobject.com/2018/01/15/typescript-flexible-nominal-typing/
export type FlavoredId<TBaseId, TFlavor> = TBaseId & Flavoring<TFlavor>;

export class ID {
  private static ids: Map<string, boolean> = new Map();

  static get() {
    let id = uuid();

    while (ID.ids.has(id)) {
      id = uuid();
    }

    ID.ids.set(id, true);

    return id;
  }
}
