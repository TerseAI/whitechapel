import type { Action, ActionResult, CaseView, Credentials } from '../../../shared/game/types.js';
import type { ConversationSocketGrant } from '../../../shared/game/conversation-socket.js';
import type { CaseSocketGrant } from '../../../shared/game/case-socket.js';
import type { SceneSocketGrant } from '../../../shared/game/scene-socket.js';
import type { CaseMode } from '../../../shared/game/case-mode.js';

import type { Identity } from './identity.js';
export type { Identity } from './identity.js';
export interface CaseEndpoint {
  create(playerId: string, secret: string, name: string, mode?: CaseMode): Promise<CaseView>;
  join(playerId: string, secret: string, name: string): Promise<CaseView>;
  snapshot(identity: Identity): Promise<CaseView>;
  act(identity: Identity, requestId: string, action: Action): Promise<ActionResult>;
  question(identity: Identity, requestId: string, action: Extract<Action, { type: 'question' }>): Promise<ActionResult>;
  prepareConversationWebsocket(identity: Identity, npcId: string): Promise<ConversationSocketGrant>;
  prepareSceneWebsocket(identity: Identity): Promise<SceneSocketGrant>;
  prepareWebsocket(identity: Identity): Promise<Omit<CaseSocketGrant, 'liveInterviews'>>;
}

export interface CaseRepository {
  get(roomId: string): CaseEndpoint;
}

export class CaseService {
  constructor(
    private readonly rooms: CaseRepository,
    private readonly newCredentials: () => Credentials,
    private readonly liveInterviews = false,
  ) {}

  async create(name: string, roomId?: string, mode: CaseMode = 'co-op') {
    const credentials = this.newCredentials();
    if (roomId) credentials.roomId = roomId;
    const room = this.rooms.get(credentials.roomId);
    const state = await (roomId
      ? room.join(credentials.playerId, credentials.secret, name)
      : room.create(credentials.playerId, credentials.secret, name, mode));
    return { credentials, state: this.presentation(state) };
  }

  async snapshot(roomId: string, identity: Identity): Promise<CaseView> {
    const state = await this.rooms.get(roomId).snapshot(identity);
    return this.presentation(state);
  }

  async act(roomId: string, identity: Identity, requestId: string, action: Action): Promise<ActionResult> {
    const room = this.rooms.get(roomId);
    return this.liveInterviews && action.type === 'question'
      ? room.question(identity, requestId, action)
      : room.act(identity, requestId, action);
  }

  async prepareConversationSocket(roomId: string, identity: Identity, npcId: string): Promise<ConversationSocketGrant> {
    if (!this.liveInterviews) throw new Error('Live interviews are unavailable.');
    return this.rooms.get(roomId).prepareConversationWebsocket(identity, npcId);
  }

  async prepareSceneSocket(roomId: string, identity: Identity): Promise<SceneSocketGrant> {
    return this.rooms.get(roomId).prepareSceneWebsocket(identity);
  }

  async prepareSocket(roomId: string, identity: Identity): Promise<CaseSocketGrant> {
    const room = this.rooms.get(roomId);
    await room.snapshot(identity);
    return { ...await room.prepareWebsocket(identity), liveInterviews: this.liveInterviews };
  }

  private presentation(state: CaseView): CaseView {
    return this.liveInterviews || !state.npcs ? state : { ...state, npcs: state.npcs.map(npc => ({ ...npc, intelligent: false })) };
  }
}
