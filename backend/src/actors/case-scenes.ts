import { createActorStub, type ActorRpcTransport } from 'terse-sdk/actors';
import { ActorAccessTransport } from 'terse-sdk/dist/actorAccess.js';
import { parseActorEndpoint } from 'terse-types/ActorEndpoint';
import { entityActorId } from './entity-identity.js';
import type { CaseScenes, SceneEndpoint } from './scene-contract.js';

export class DurableCaseScenes implements CaseScenes {
  constructor(private readonly transport: ActorRpcTransport = new ActorAccessTransport(workerCredentials)) {}
  scene(caseId: string, location: string): SceneEndpoint {
    return createActorStub('SceneActor', entityActorId(caseId, location), [
      { name: 'ensureVisit', result: 'void' }, { name: 'leave', result: 'void' },
      { name: 'beginInteraction', result: 'value' }, { name: 'setInteraction', result: 'void' },
      { name: 'snapshot', result: 'value' },
    ], this.transport);
  }
}

export function workerCredentials() {
  const url = process.env.WHITECHAPEL_ACTOR_URL, apiKey = process.env.WHITECHAPEL_ACTOR_KEY;
  if (!url || !apiKey) throw new Error('Actor workers require WHITECHAPEL_ACTOR_URL and WHITECHAPEL_ACTOR_KEY.');
  return { endpoint: parseActorEndpoint(url), apiKey };
}
