import { actors } from './generated/index.js';
import { caseActorId, entityActorId, conversationActorId } from './entity-identity.js';
import type { CaseRepository } from '../cases/case-service.js';
import type { Action } from '../../../shared/game/types.js';
import type { Identity } from '../cases/identity.js';

type CaseStub = ReturnType<typeof actors.CaseActor.get>;

/** Gateway-side handles on a case actor and the scene actor its player currently occupies. */
export class DurableCaseRepository implements CaseRepository {
  constructor(
    private readonly rooms = actors.CaseActor,
    private readonly openSocket = (url: string) => new WebSocket(url),
  ) {}

  get(roomId: string) {
    const actorId = caseActorId(roomId);
    const room = this.rooms.get(actorId);
    return {
      ...room,
      question: async (identity: Identity, requestId: string, action: Extract<Action, { type: 'question' }>) => {
        const { conversation } = await this.#conversation(room, identity, action.npcId);
        return conversation.run({ ...identity, npcId: action.npcId }, requestId, action);
      },
      prepareConversationWebsocket: async (identity: Identity, npcId: string) => {
        const { actorId, entityId } = await this.#conversation(room, identity, npcId);
        return { ...await actors.ConversationActor.prepareWebsocket({ actorId, metadata: { ...identity, npcId } }), entityId };
      },
      connect: (identity: Identity) => this.#connect(actorId, identity),
      prepareWebsocket: (metadata: Identity) => this.rooms.prepareWebsocket({ actorId, metadata }),
      prepareSceneWebsocket: (identity: Identity) => this.#prepareSceneWebsocket(roomId, room, identity),
    };
  }

  async #conversation(room: CaseStub, identity: Identity, npcId: string) {
    const { scope, member } = await room.conversationSession(identity, npcId);
    const actorId = conversationActorId(scope.caseId, scope.entityId);
    const conversation = actors.ConversationActor.get(actorId);
    await conversation.configure(scope, member);
    return { conversation, actorId, entityId: scope.entityId };
  }

  async #prepareSceneWebsocket(roomId: string, room: CaseStub, identity: Identity) {
    const visit = await room.sceneSession(identity);
    const grant = await actors.SceneActor.prepareWebsocket({
      actorId: entityActorId(roomId, visit.location),
      metadata: { ...identity, visit: visit.visit },
    });
    return { ...grant, ...visit };
  }

  async #connect(actorId: string, metadata: Identity) {
    const grant = await this.rooms.prepareWebsocket({ actorId, metadata });
    const socket = this.openSocket(grant.websocketUrl);
    await this.#opened(socket);
    return socket;
  }

  #opened(socket: WebSocket) {
    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        socket.removeEventListener('open', opened);
        socket.removeEventListener('error', failed);
        socket.removeEventListener('close', failed);
      };
      const opened = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error('Could not connect to the case actor.')); };
      const timer = setTimeout(() => { failed(); socket.close(); }, 30_000);
      socket.addEventListener('open', opened, { once: true });
      socket.addEventListener('error', failed, { once: true });
      socket.addEventListener('close', failed, { once: true });
    });
  }
}
