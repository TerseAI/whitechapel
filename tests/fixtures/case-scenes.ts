import { SceneActor } from '../../backend/src/actors/scene-actor';
import { entityActorId } from '../../backend/src/actors/entity-identity';

export class MemoryCaseScenes {
  readonly calls: string[] = [];
  failAfter?: string;
  private readonly scenes = new Map<string, SceneActor>();
  scene(caseId: string, location: string) {
    const key = entityActorId(caseId, location);
    if (!this.scenes.has(key)) this.scenes.set(key, new class extends SceneActor {
      constructor() { super(); }
      protected get id() { return key; }
      protected broadcast() {}
    }());
    const store = this;
    return new Proxy(this.scenes.get(key)!, {
      get(target, method) {
        const value = Reflect.get(target, method);
        if (typeof value !== 'function') return value;
        return async (...args: unknown[]) => {
          const call = `${location}:${String(method)}`;
          store.calls.push(call);
          const result = await value.apply(target, args);
          if (store.failAfter === call) { store.failAfter = undefined; throw new Error('Scene response interrupted.'); }
          return result;
        };
      },
    });
  }
}
