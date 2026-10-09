import { createActorStub, type ActorRpcTransport } from 'terse-sdk/actors';
import { ActorAccessTransport } from 'terse-sdk/dist/actorAccess.js';
import type { Identity } from '../cases/identity.js';
import type { InterviewAction, InterviewAuthority, PreparedTurn, TurnDraft } from '../intelligence/types.js';
import type { ActionResult } from '../../../shared/game/types.js';
import { caseActorId, conversationActorId } from './entity-identity.js';
import { workerCredentials } from './case-scenes.js';

export interface CaseInterviewAuthority {
  authorizeMicrophone(identity: Identity, npcId: string): Promise<ActionResult>;
  prepareInterview(identity: Identity, id: string, action: InterviewAction): Promise<PreparedTurn>;
  commitInterview(identity: Identity, id: string, draft: TurnDraft): Promise<ActionResult>;
}
export interface ConversationEndpoint extends InterviewAuthority {
  releaseInterview(identity: Identity, id: string, worker: string): Promise<void>;
}
export interface ConversationConnections {
  case(caseId: string): CaseInterviewAuthority;
  conversation(caseId: string, entityId: string): ConversationEndpoint;
}
export class DurableConversations implements ConversationConnections {
  constructor(private readonly transport: ActorRpcTransport = new ActorAccessTransport(workerCredentials)) {}
  case(caseId: string): CaseInterviewAuthority {
    return createActorStub('CaseActor', caseActorId(caseId), [
      { name: 'authorizeMicrophone', result: 'value' },
      { name: 'prepareInterview', result: 'value' }, { name: 'commitInterview', result: 'value' },
    ], this.transport);
  }
  conversation(caseId: string, entityId: string): ConversationEndpoint {
    return createActorStub('ConversationActor', conversationActorId(caseId, entityId), [
      { name: 'prepareInterview', result: 'value' }, { name: 'claimInterview', result: 'value' },
      { name: 'saveInterview', result: 'void' }, { name: 'commitInterview', result: 'value' },
      { name: 'releaseInterview', result: 'void' },
    ], this.transport);
  }
}
