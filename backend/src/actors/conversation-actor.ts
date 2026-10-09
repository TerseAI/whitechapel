import { Actor, Compute, Ephemeral, Interleave, Persisted, type ActorSocket } from 'terse-sdk/actor';
import { z } from 'zod';
import type { ConversationCommand, ConversationEvent, ConversationIdentity, ConversationMember, ConversationPage, ConversationResult, ConversationScope, ConversationView } from '../../../shared/game/conversation-socket.js';
import type { ActionResult } from '../../../shared/game/types.js';
import { activeStory } from '../active-story.js';
import { actionSchema } from '../cases/commands.js';
import type { Identity } from '../cases/identity.js';
import { ConversationMicrophone } from '../conversations/microphone.js';
import { speechRecording } from '../../../shared/game/speech-recording.js';
import { TranscriptionError } from '../intelligence/fal-transcription.js';
import { ConversationStore } from '../conversations/conversation-store.js';
import { InterviewCoordinator } from '../intelligence/coordinator.js';
import { createDialogueProviders, type DialogueProviders } from '../intelligence/providers.js';
import type { InterviewAction, PreparedTurn, TurnDraft } from '../intelligence/types.js';
import { DurableConversations, type ConversationConnections } from './conversation-connections.js';
import { conversationActorId, validSecret, wire } from './entity-identity.js';

const commandSchema = z.object({ requestId: z.string().uuid(), action: z.union([actionSchema,
  z.object({ type: z.literal('cancel'), npcId: z.string().min(1).max(80) }),
  z.object({ type: z.literal('history'), before: z.number().int().positive().optional() }),
  z.object({ type: z.literal('audioChunk'), uploadId: z.string().uuid(), index: z.number().int().min(0).max(50), data: z.string().min(4).max(speechRecording.chunkBytes * 4 / 3) }),
  z.object({ type: z.literal('transcribe'), uploadId: z.string().uuid() }),
  z.object({ type: z.literal('cancelMicrophone'), uploadId: z.string().uuid() }),
]) });

@Compute({ idleTimeoutMs: 5000 })
export class ConversationActor extends Actor<ConversationIdentity, ConversationCommand, ConversationEvent> {
  @Persisted private scope: ConversationScope | null = null;
  @Persisted private members: Record<string, string> = {};
  @Persisted private revision = 0;
  @Ephemeral private connections: ConversationConnections;
  @Ephemeral private providers: () => DialogueProviders;
  @Ephemeral private services?: DialogueProviders;
  @Ephemeral private microphone?: ConversationMicrophone;
  @Ephemeral private coordinator?: InterviewCoordinator;

  protected constructor(connections: ConversationConnections = new DurableConversations(), providers = createDialogueProviders) {
    super(); this.connections = connections; this.providers = providers;
  }

  async configure(scope: ConversationScope, member: ConversationMember): Promise<void> {
    if (this.id !== conversationActorId(scope.caseId, scope.entityId) || scope.storyId !== activeStory.id || scope.storyVersion !== activeStory.version)
      throw new Error('Conversation belongs to another case or story.');
    if (this.scope && JSON.stringify(this.scope) !== JSON.stringify(scope)) throw new Error('Conversation scope cannot change.');
    if (this.members[member.playerId] && this.members[member.playerId] !== member.secretHash) throw new Error('Your investigator session is not valid.');
    this.scope = scope; this.members[member.playerId] = member.secretHash;
  }

  @Interleave
  async run(identity: ConversationIdentity, id: string, action: InterviewAction): Promise<ActionResult> {
    this.#member(identity); this.#character(identity.npcId);
    if (action.npcId !== identity.npcId || action.type !== 'question') throw new Error('That question belongs to another conversation.');
    const parsed = actionSchema.parse(action);
    if (parsed.type !== 'question') throw new Error('Speak in your own words.');
    return this.#coordinator().run(this.scope!.caseId, identity, id, parsed);
  }

  async prepareInterview(identity: Identity, id: string, action: InterviewAction): Promise<PreparedTurn> {
    this.#member(identity); this.#character(action.npcId);
    const store = this.#store(), existing = store.get(id);
    if (existing) {
      if (existing.turn.playerId !== identity.playerId || JSON.stringify(existing.turn.action) !== JSON.stringify(action)) throw new Error('Request belongs to another turn.');
      return existing.turn.result ? { result: existing.turn.result } : existing;
    }
    if (store.pending()) return { result: { ok: false, pending: true, message: 'Waiting for a response.' } };
    const prepared = await this.connections.case(this.scope!.caseId).prepareInterview(identity, id, action);
    if (prepared.context && prepared.turn) {
      for (const reply of prepared.context.memories) store.append(reply);
      const context = { ...prepared.context, conversation: store.recent(), standing: store.standing(identity.playerId) };
      const saved = store.reserve(context, prepared.turn);
      this.#publish();
      return saved;
    }
    if (prepared.result?.ok && prepared.result.reply) store.append(prepared.result.reply);
    return prepared;
  }

  async claimInterview(identity: Identity, id: string, worker: string): Promise<boolean> {
    this.#turn(identity, id);
    return this.#store().claim(id, worker);
  }

  async saveInterview(identity: Identity, id: string, worker: string, draft: TurnDraft): Promise<void> {
    this.#turn(identity, id);
    this.#store().save(id, worker, draft); this.#publish();
  }

  async releaseInterview(identity: Identity, id: string, worker: string): Promise<void> {
    this.#turn(identity, id); this.#store().release(id, worker);
  }

  async commitInterview(identity: Identity, id: string, worker: string): Promise<ActionResult> {
    const { turn } = this.#turn(identity, id);
    if (turn.result) return turn.result;
    if (turn.status !== 'pending' || turn.worker !== worker || (turn.workerUntil ?? 0) <= Date.now()) throw new Error('Generation ownership expired.');
    const result = await this.connections.case(this.scope!.caseId).commitInterview(identity, id, turn.draft);
    this.#store().finish(id, result); this.#publish(result);
    return result;
  }

  async history(identity: ConversationIdentity, before?: number): Promise<ConversationPage> {
    this.#member(identity); this.#character(identity.npcId);
    return this.#store().history(before);
  }

  async cancel(identity: ConversationIdentity): Promise<void> {
    this.#member(identity); this.#character(identity.npcId);
    this.microphone?.cancelPlayer(identity.playerId);
    this.#store().cancel(identity.playerId, identity.npcId); this.#publish();
  }

  async onConnect(socket: ActorSocket<ConversationIdentity, ConversationEvent>): Promise<void> {
    this.#member(socket.metadata); this.#character(socket.metadata.npcId);
    socket.send({ type: 'conversation', state: wire(this.#view()) });
  }

  async onDisconnect(socket: ActorSocket<ConversationIdentity, ConversationEvent>): Promise<void> {
    this.microphone?.cancel(socket.id, socket.metadata.playerId);
  }

  @Interleave
  async onMessage(socket: ActorSocket<ConversationIdentity, ConversationEvent>, message: ConversationCommand): Promise<void> {
    const command = commandSchema.safeParse(message);
    if (!command.success) {
      if (typeof message?.requestId === 'string') socket.send({ type: 'result', requestId: message.requestId, result: { ok: false, message: 'Invalid conversation message.' } });
      return;
    }
    const { requestId, action } = command.data;
    try {
      this.#member(socket.metadata); this.#character(socket.metadata.npcId);
      if (action.type === 'heartbeat') {
        socket.send({ type: 'result', requestId, result: { ok: true, message: '' } });
        const pending = this.#store().pending()?.turn;
        if (pending?.playerId === socket.metadata.playerId)
          await this.run({ ...socket.metadata, npcId: pending.npcId }, pending.id, pending.action);
        return;
      }
      let result: ConversationResult = { ok: true, message: '' };
      if (action.type === 'question') result = await this.run(socket.metadata, requestId, action);
      else if (action.type === 'audioChunk') this.#microphone().append(socket.id, socket.metadata, action.uploadId, action.index, action.data);
      else if (action.type === 'transcribe') result.transcript = await this.#microphone().transcribe(socket.id, socket.metadata, action.uploadId);
      else if (action.type === 'cancelMicrophone') this.microphone?.cancel(socket.id, socket.metadata.playerId, action.uploadId);
      else if (action.type === 'cancel' && action.npcId === socket.metadata.npcId) await this.cancel(socket.metadata);
      else if (action.type === 'history') socket.send({ type: 'conversation', state: wire(this.#view(action.before)) });
      else result = { ok: false, message: 'That action belongs to the case.' };
      socket.send({ type: 'result', requestId, result: wire(result) });
    } catch (error) {
      socket.send({ type: 'result', requestId, result: { ok: false, message: error instanceof TranscriptionError ? error.message : 'The conversation was interrupted. Reconnect to resume your saved turn.' } });
    }
  }

  #microphone() {
    return this.microphone ??= new ConversationMicrophone(identity => this.connections.case(this.scope!.caseId).authorizeMicrophone(identity, identity.npcId), () => this.#services().microphone);
  }

  #services() { return this.services ??= this.providers(); }

  #coordinator() {
    if (!this.coordinator) {
      const { director, performer, speech } = this.#services();
      // Short self-RPCs persist checkpoints while the interleaved generation call is still running.
      this.coordinator = new InterviewCoordinator({ get: () => this.connections.conversation(this.scope!.caseId, this.scope!.entityId) }, director, performer, speech, activeStory.characters);
    }
    return this.coordinator;
  }

  #member(identity: Identity) {
    const hash = this.members[identity.playerId];
    if (!this.scope || !hash || !validSecret(identity.secret, hash)) throw new Error('Your investigator session is not valid.');
  }

  #character(npcId: string) {
    const npc = activeStory.characters.find(npc => npc.id === npcId && npc.entityId === this.scope?.entityId);
    if (!npc?.mind) throw new Error('Unknown conversation character.');
    return npc;
  }

  #turn(identity: Identity, id: string) {
    this.#member(identity);
    const saved = this.#store().get(id);
    if (!saved || saved.turn.playerId !== identity.playerId) throw new Error('That turn belongs to another investigator.');
    return saved;
  }

  #store() { return new ConversationStore(this.db); }

  #view(before?: number, includeHistory = true): ConversationView {
    const store = this.#store(), pending = store.pending()?.turn;
    const draft = pending?.draft;
    const stage = !draft?.decision ? 'decision' : !draft.performance ? 'reply' : !draft.assessment?.safe ? 'review' : 'voice';
    return { entityId: this.scope!.entityId, revision: this.revision, ...(includeHistory ? store.history(before) : { replies: [] }),
      ...(pending ? { pending: { id: pending.id, playerId: pending.playerId, action: pending.action, stage } } : {}),
    };
  }

  #publish(result?: ActionResult) {
    this.revision++;
    this.broadcast({ type: 'conversation', state: wire({ ...this.#view(undefined, false), ...(result ? { result, replies: result.reply ? [result.reply] : [] } : {}) }) });
  }
}
