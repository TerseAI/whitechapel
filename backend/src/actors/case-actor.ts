import { randomUUID } from "node:crypto";
import {
  Actor,
  Compute,
  Ephemeral,
  Persisted,
  type ActorSocket,
} from "terse-sdk/actor";
import type { ConversationScope, ConversationMember } from '../../../shared/game/conversation-socket.js';
import type { CaseMode } from "../../../shared/game/case-mode.js";
import {
  actOnCutscene,
  startCutscene,
  type CutsceneState,
  type TransitionTarget,
} from "../../../shared/game/cutscenes.js";
import { reportKey } from "../../../shared/game/final-report.js";
import {
  createInterviewSpeech,
  type SpeechSubject,
} from "../../../shared/game/interview-speech.js";
import {
  interviewEnded,
  topicAvailable,
  topicReply,
} from "../../../shared/game/interviews.js";
import {
  chapterProgress,
  investigationGuidance,
  investigationQuestions,
} from "../../../shared/game/investigation.js";
import {
  closeEnoughToInspect,
  cluePosition,
  inspectorSpawn,
} from "../../../shared/game/navigation.js";
import {
  objectForHotspot,
  observedObjectSteps,
  type ObjectInspections,
} from "../../../shared/game/physical-objects.js";
import {
  completionView,
  stageEntry,
  stageReady,
} from "../../../shared/game/progression.js";
import {
  publicReconstruction,
  reconstructionForPair,
  validReconstruction,
} from "../../../shared/game/reconstructions.js";
import {
  canStartCase,
  chooseInspector,
  gameplayBlock,
} from "../../../shared/game/session.js";
import { gateOpen } from "../../../shared/game/story-gates.js";
import type {
  Action,
  ActionResult,
  CaseView,
  InterviewSpeech,
  NpcView,
  PlaceId,
  Player,
  Reply,
} from "../../../shared/game/types.js";
import { activeStory } from "../active-story.js";
import { cutscenes } from "../campaign-data.js";
import { revealedConnections } from "../cases/connections.js";
import { examineObject } from "../cases/object-inspection.js";
import { reportAgreement } from "../cases/report-agreement.js";
import { systemClock } from "../clock.js";
import {
  contextFingerprint,
  prepareContext,
} from "../intelligence/case-context.js";
import { conversationReply } from "../intelligence/conversation-policy.js";
import { TurnJournal } from "../intelligence/turn-journal.js";
import type {
  InterviewAction,
  PreparedTurn,
  TurnDraft,
  TurnRecord,
} from "../intelligence/types.js";
import { CharacterState, publicTopics } from "../interviews/character-state.js";
import {
  mergeInterviewRecords,
  testimonyStatements,
} from "../interviews/interview-records.js";
import {
  campaign,
  characters,
  clues,
  deductions,
  endingText,
  getCharacter,
} from "../story.js";
import { DurableCaseScenes } from "./case-scenes.js";
import {
  caseIdFromActorId,
  hashSecret as hash,
  validSecret,
  wire,
} from "./entity-identity.js";
import type { CaseScenes } from "./scene-contract.js";

import type {
  CaseCommand,
  CaseEvent,
} from "../../../shared/game/case-socket.js";
import type { Identity } from "../cases/identity.js";
import { handleCaseCommand } from "../cases/socket-command.js";
const physicalObjects = activeStory.objects;
type Member = Player & { secretHash: string };
/** The case is the authority for membership, clues, progression and joint decisions. */
@Compute({ idleTimeoutMs: 5000 })
export class CaseActor extends Actor<Identity, CaseCommand, CaseEvent> {
  @Ephemeral private connectedPlayers: string[] = [];
  @Persisted private hintLevels: Record<string, Record<string, number>> = {};
  @Persisted private leadClaims: Record<string, Record<string, string>> = {};
  @Persisted private turns: TurnRecord[] = [];
  @Persisted private storyId = "";
  @Persisted private storyVersion = "";
  @Persisted private mode: CaseMode = "co-op";
  @Persisted private members: Member[] = [];
  @Persisted private found: Record<string, string> = {};
  @Persisted private inspections: ObjectInspections = {};
  @Persisted private solvedDeductions: string[] = [];
  @Persisted private connectedEvidence: Record<string, [string, string]> = {};
  @Ephemeral private npcViews: NpcView[] = [];
  @Persisted private appearances: Record<
    string,
    Pick<NpcView, "trust" | "replies" | "lease">
  > = {};
  @Persisted private phase: CaseView["phase"] = "lobby";
  @Persisted private cutscene: CutsceneState | null = null;
  @Persisted private revision = 0;
  @Persisted private log: CaseView["log"] = [];
  @Persisted private notes: CaseView["notes"] = [];
  @Persisted private votes: Record<string, string> = {};
  @Persisted private lastFeedback: string | null = null;
  @Persisted private requests: {
    id: string;
    playerId: string;
    result: ActionResult;
  }[] = [];
  @Persisted private chapterIndex = 0;
  @Persisted private decisions: Record<string, string> = {};
  @Persisted private reportAccepted = false;
  @Persisted private chapterReports: { title: string; text: string }[] = [];

  @Persisted private epoch = 0;
  @Persisted private travelOrders: Record<
    string,
    { from: string | null; visit: number }
  > = {};
  @Ephemeral private scenes: CaseScenes;
  protected constructor(scenes: CaseScenes = new DurableCaseScenes()) {
    super();
    this.scenes = scenes;
  }
  @Persisted private speech: InterviewSpeech[] = [];
  async create(
    playerId: string,
    secret: string,
    name: string,
    mode: CaseMode = "co-op",
  ): Promise<CaseView> {
    await this.#refreshConnections();
    if (this.members.length) throw new Error("This case already exists.");
    if (mode !== "solo" && mode !== "co-op")
      throw new Error("Unknown case mode.");
    this.mode = mode;
    this.storyId = activeStory.id;
    this.storyVersion = activeStory.version;
    this.members.push({
      id: playerId,
      secretHash: hash(secret),
      name: "Choose an inspector",
      role: activeStory.inspectors[0].id,
      selected: false,
      ready: false,
      location: campaign[0].flow.entry,
      lastSeen: Date.now(),
      position: { x: -1, z: 8 },
    });
    this.#resetPosition(this.members[0], campaign[0].flow.entry);
    this.npcViews = this.#chapterCharacters();
    this.#record(
      mode === "solo"
        ? "A solo investigation has begun."
        : `${name} opened the case. There is room for one partner.`,
    );
    return this.#view();
  }
  async join(
    playerId: string,
    secret: string,
    name: string,
  ): Promise<CaseView> {
    await this.#refreshConnections();
    this.#assertStory();
    if (!this.members.length)
      throw new Error("That case was not found. Check your invitation.");
    if (this.mode === "solo")
      throw new Error(
        "That case is single-player. Start your own case to play.",
      );
    if (this.members.length >= 2)
      throw new Error(
        "Both investigator places are taken. Return in the browser you used before.",
      );
    if (this.phase !== "lobby")
      throw new Error(
        "This case has already begun. Reconnect with your existing inspector.",
      );
    this.members.push({
      id: playerId,
      secretHash: hash(secret),
      name: "Choose an inspector",
      role: activeStory.inspectors[1].id,
      selected: false,
      ready: false,
      location: this.#locations()[0].id,
      lastSeen: Date.now(),
      position: { x: 1, z: 8 },
    });
    this.#resetPosition(this.members.at(-1)!, this.members.at(-1)!.location);
    this.#record(`${name} joined the investigation.`);
    this.#notify();
    return this.#view();
  }
  async snapshot(identity: Identity): Promise<CaseView> {
    this.#member(identity);
    await this.#flushTravel();
    await Promise.all(
      [...new Set(this.members.map((member) => member.location))].map(
        (location) => this.#readScene(location),
      ),
    );
    await this.#refreshConnections();
    return this.#view();
  }

  async act(
    identity: Identity,
    requestId: string,
    action: Action,
  ): Promise<ActionResult> {
    const player = this.#member(identity);
    if (action.type === "move" || action.type === "wave")
      return {
        ok: false,
        message: "Connect directly to your scene to move or wave.",
      };
    this.#restoreChapterCharacters();
    const cached = this.requests.find(
      (request) => request.id === requestId && request.playerId === player.id,
    );
    if (cached) return cached.result;
    await this.#refreshConnections();
    player.lastSeen = Date.now();
    const blocked = gameplayBlock(this.phase, action.type, this.mode);
    if (blocked) return { ok: false, message: blocked };
    if (["begin", "inspect", "examineObject"].includes(action.type))
      await this.#flushTravel();
    if (action.type === "inspect" || action.type === "examineObject")
      await this.#refreshPosition(player);
    switch (action.type) {
      case "hint":
      case "followLead":
        return this.#leadAction(player, requestId, action);
      case "selectInspector": {
        const error = chooseInspector(
          this.members,
          player.id,
          action.inspector,
          activeStory.inspectors,
        );
        return this.#complete(player, requestId, {
          ok: !error,
          message: error ?? "Inspector selected.",
        });
      }
      case "ready":
        return this.#setReady(player, requestId, action.ready);
      case "cutscene":
        return this.#cutsceneAction(player, requestId, action.command);
      case "continueStage":
        return this.#continueStage(player, requestId);
      case "activity":
        return this.#activity(player, requestId, action);
      case "travel":
        return this.#travel(player, requestId, action);
      case "inspect":
        return this.#inspect(player, requestId, action);
      case "examineObject":
        return this.#examineObject(
          player,
          requestId,
          action.objectId,
          action.stepId,
        );
      case "begin":
        return this.#beginInterview(player, requestId, action);
      case "end":
        return this.#endInterview(player, requestId, action);
      case "ask":
        return this.#askQuestion(player, requestId, action);
      case "question":
        return {
          ok: false,
          message: "Open questions require the character director.",
        };
      case "answer":
        return this.#answerQuestion(player, requestId, action);
      case "deduce":
        return this.#deduce(player, requestId, action);
      case "note":
        return this.#writeNote(player, requestId, action);
      case "finalReport":
        return this.#submitFinalReport(player, requestId, action);
      case "chapterVote":
        return this.#submitChapterReport(player, requestId, action);
      case "heartbeat":
        return this.#heartbeat(player);
    }
  }
  async prepareInterview(
    identity: Identity,
    id: string,
    action: InterviewAction,
  ): Promise<PreparedTurn> {
    const player = this.#member(identity);
    this.#restoreChapterCharacters();
    await this.#refreshConnections();
    const journal = this.#journal();
    const existing = journal.get(id);
    if (existing?.playerId !== undefined && existing.playerId !== player.id)
      throw new Error("Request belongs to another investigator.");
    if (existing?.result) return { result: existing.result };
    const saved = this.npcViews
      .flatMap((npc) => npc.replies)
      .find((reply) => reply.id === id && reply.playerId === player.id);
    if (saved)
      return {
        result: {
          ok: true,
          message: "Statement already recorded.",
          reply: saved,
        },
      };
    if (existing?.status === "cancelled")
      return {
        result: { ok: false, message: "That conversation was closed." },
      };
    try {
      if (
        existing &&
        this.phase === "investigating" &&
        getCharacter(action.npcId).location === player.location
      ) {
        const acquired = this.#character(action.npcId).acquire(player.id);
        if (acquired.ok) this.#updateNpc(acquired.view);
      }
      const context = this.#interviewContext(player.id, action);
      const fingerprint = contextFingerprint(context, this.chapterIndex);
      if (existing && existing.fingerprint !== fingerprint) {
        journal.cancelFor(player.id);
        return {
          result: {
            ok: false,
            message:
              "The enquiry changed while preparing this reply. Ask again.",
          },
        };
      }
      const turn = journal.reserve(
        id,
        player.id,
        action.npcId,
        fingerprint,
        action,
      );
      this.turns = journal.records();
      this.#updateNpc(this.#character(action.npcId).renew(player.id));
      this.#notify();
      return { turn, context };
    } catch (error) {
      if (existing) {
        journal.cancelFor(player.id);
        this.#notify();
      }
      return {
        result: {
          ok: false,
          message:
            error instanceof Error
              ? error.message
              : "That question is unavailable.",
        },
      };
    }
  }

  async authorizeMicrophone(identity: Identity, npcId: string): Promise<ActionResult> {
    const player = this.#member(identity);
    this.#restoreChapterCharacters();
    const npc = this.npcViews.find(npc => npc.id === npcId);
    if (this.phase !== "investigating" || !this.#activeNpcIds().includes(npcId) || !getCharacter(npcId).mind
      || npc?.location !== player.location || npc.lease?.playerId !== player.id || npc.lease.until <= Date.now())
      return { ok: false, message: "Start a conversation with this character first." };
    return { ok: true, message: "" };
  }

  async conversationSession(identity: Identity, npcId: string): Promise<{ scope: ConversationScope; member: ConversationMember }> {
    const player = this.#member(identity);
    const npc = getCharacter(npcId);
    if (!npc.mind) throw new Error("This character is not configured for conversation.");
    return {
      scope: { caseId: caseIdFromActorId(this.id), entityId: npc.entityId, storyId: this.storyId, storyVersion: this.storyVersion },
      member: { playerId: player.id, secretHash: player.secretHash },
    };
  }

  async commitInterview(
    identity: Identity,
    id: string,
    draft: TurnDraft,
  ): Promise<ActionResult> {
    const player = this.#member(identity);
    await this.#refreshConnections();
    const journal = this.#journal();
    const turn = journal.get(id);
    if (!turn || turn.playerId !== player.id)
      throw new Error("That turn belongs to another investigator.");
    if (turn.result) return turn.result;
    if (turn.status !== "pending")
      return {
        ok: false,
        message: "That conversation was closed or interrupted.",
      };
    let result: ActionResult;
    try {
      result = this.#commitPerformance(player, { ...turn, draft });
    } catch {
      result = {
        ok: false,
        message: "The enquiry changed while preparing this reply. Ask again.",
      };
    }
    journal.complete(id, result);
    this.turns = journal.records();
    const completed = this.#complete(player, id, result);
    turn.result = completed;
    return completed;
  }

  #commitPerformance(player: Member, turn: TurnRecord): ActionResult {
    this.#restoreChapterCharacters();
    const acquired = this.#character(turn.npcId).acquire(player.id);
    if (!acquired.ok) throw new Error("The conversation has ended.");
    this.#updateNpc(acquired.view);
    const context = this.#interviewContext(player.id, turn.action);
    if (contextFingerprint(context, this.chapterIndex) !== turn.fingerprint)
      throw new Error("Stale interview context.");
    if (turn.draft.failure) return { ok: false, message: turn.draft.failure };
    if (turn.draft.decision?.blocked)
      return {
        ok: false,
        message:
          "Keep the confidential recovery details out of this conversation until the witness gives their own account.",
      };
    const reply = conversationReply(context, turn.draft, turn.id, Date.now());
    const accepted = this.#character(turn.npcId).accept(reply);
    if (!accepted.reply) throw new Error("The conversation has ended.");
    this.#updateNpc(accepted.view);
    return this.#recordAnswer(player, turn.id, context.npc, accepted.reply);
  }

  #interviewContext(playerId: string, action: InterviewAction) {
    const npc = getCharacter(action.npcId);
    const memories = characters.filter(character => character.entityId === npc.entityId)
      .flatMap(character => this.appearances[character.id]?.replies ?? []).sort((a, b) => a.at - b.at);
    return prepareContext(
      activeStory,
      this.#view(),
      npc,
      playerId,
      action,
      memories,
    );
  }

  #journal() {
    return new TurnJournal(this.turns, Date.now);
  }

  async onConnect(socket: ActorSocket<Identity, CaseEvent>): Promise<void> {
    await this.#refreshConnections();
    const player = this.#member(socket.metadata);
    this.#restoreChapterCharacters();
    await this.#flushTravel();
    await this.#syncInteraction(player);
    player.lastSeen = Date.now();
    if (this.phase === "lobby") player.ready = false;
    if (this.cutscene)
      this.cutscene.ready = this.cutscene.ready.filter(
        (id) => id !== player.id,
      );
    socket.send({ type: "update", state: wire(this.#view()) });
    this.#notify();
  }
  async onMessage(
    socket: ActorSocket<Identity, CaseEvent>,
    message: CaseCommand,
  ): Promise<void> {
    await handleCaseCommand(socket, message, (identity, id, action) =>
      this.act(identity, id, action),
    );
  }
  async onDisconnect(socket: ActorSocket<Identity, CaseEvent>): Promise<void> {
    await this.#refreshConnections(socket.id);
    if (this.connectedPlayers.includes(socket.metadata.playerId)) return;
    const player = this.members.find((p) => p.id === socket.metadata.playerId);
    if (!player) return;
    this.#restoreChapterCharacters();
    player.lastSeen = 0;
    if (this.phase === "lobby") player.ready = false;
    if (this.cutscene)
      this.cutscene.ready = this.cutscene.ready.filter(
        (id) => id !== player.id,
      );
    if (
      !this.turns.some(
        (turn) => turn.playerId === player.id && turn.status === "pending",
      )
    ) {
      this.#releaseConversations(player.id);
      await this.#syncInteraction(player);
    }
    this.#notify();
  }

  #setReady(player: Member, requestId: string, ready: boolean): ActionResult {
    if (!player.selected)
      return { ok: false, message: "Choose your inspector first." };
    if (!this.#connected().includes(player.id))
      return { ok: false, message: "Reconnect before confirming readiness." };
    player.ready = ready;
    if (canStartCase(this.members, this.#connected(), this.mode))
      this.#enterChapter();
    return this.#complete(player, requestId, {
      ok: true,
      message: ready
        ? this.mode === "solo"
          ? "The enquiry begins."
          : "Ready. Waiting for both inspectors."
        : "Readiness withdrawn.",
    });
  }

  #cutsceneAction(
    player: Member,
    requestId: string,
    command: Extract<Action, { type: "cutscene" }>["command"],
  ): ActionResult {
    if (!this.cutscene)
      return { ok: false, message: "There is no active scene." };
    const scene = cutscenes.find((scene) => scene.id === this.cutscene!.id)!;
    const result = actOnCutscene(
      this.cutscene,
      scene,
      this.members.map((p) => p.id),
      this.#connected(),
      player.id,
      command,
      this.mode,
    );
    if (result.finished) {
      const next = this.cutscene.next;
      this.cutscene = null;
      this.#transition(next);
    }
    return this.#complete(player, requestId, {
      ok: result.ok,
      message: result.message,
    });
  }

  #continueStage(player: Member, requestId: string): ActionResult {
    if (this.#chapter().flow.completion.kind !== "continue" || !this.#ready())
      return { ok: false, message: "Complete this stage before continuing." };
    this.votes[player.id] = "continue";
    if (
      reportAgreement(
        this.members.map((p) => p.id),
        this.votes,
        this.mode,
      ) === "agreed"
    )
      this.#finishStage();
    return this.#complete(player, requestId, {
      ok: true,
      message:
        this.mode === "solo"
          ? "Continuing the enquiry."
          : "Ready to continue. Waiting for both inspectors.",
    });
  }

  #activity(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "activity" }>,
  ): ActionResult {
    const result: ActionResult = { ok: true, message: "" };
    if (player.activity === action.activity) return result;
    player.activity = action.activity;
    if (action.activity === "casebook")
      player.motion = {
        at: Date.now(),
        moving: false,
        heading: player.motion?.heading ?? 0,
      };
    return this.#complete(player, requestId, result);
  }

  #travel(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "travel" }>,
  ): ActionResult {
    const place = this.#locations().find(
      (place) => place.id === action.location,
    );
    if (!place)
      return { ok: false, message: "That location is not on your map." };
    this.#releaseConversations(player.id);
    this.#resetPosition(player, action.location);
    return this.#complete(player, requestId, {
      ok: true,
      message: `Arrived at ${place.name}.`,
    });
  }

  #inspect(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "inspect" }>,
  ): ActionResult {
    const object = objectForHotspot(action.clueId, physicalObjects);
    if (object) return this.#examineObject(player, requestId, object.id);
    const clue = clues[action.clueId];
    if (
      !clue ||
      !this.#chapter().clueIds.includes(clue.id) ||
      clue.kind !== "object" ||
      clue.location !== player.location
    )
      return {
        ok: false,
        message: "Travel to the scene before inspecting that object.",
      };
    const place = this.#locations().find((p) => p.id === clue.location)!;
    const index = place.hotspots.findIndex((h) => h.id === clue.id);
    if (
      index < 0 ||
      !closeEnoughToInspect(
        player.position,
        cluePosition(
          index,
          place.indoor,
          place.navigation,
          place.hotspots[index].id,
        ),
      )
    )
      return { ok: false, message: "Walk closer to examine this object." };
    if (!this.found[clue.id]) {
      this.found[clue.id] = player.id;
      this.#record(`${player.name} found ${clue.title.toLowerCase()}.`);
    }
    return this.#complete(player, requestId, {
      ok: true,
      message: clue.description,
      evidence: { ...this.#evidence(clue.id), foundBy: this.found[clue.id] },
    });
  }

  #examineObject(
    player: Member,
    requestId: string,
    objectId: string,
    stepId?: string,
  ): ActionResult {
    const result = examineObject(
      {
        mode: this.mode,
        chapter: this.chapterIndex,
        places: this.#locations(),
        player,
        members: this.members.filter((member) =>
          this.#connected().includes(member.id),
        ),
        found: Object.keys(this.found),
        deductions: this.solvedDeductions,
        inspections: this.inspections,
      },
      objectId,
      stepId,
      physicalObjects,
    );
    if (!result.ok) return result;
    this.inspections[objectId] = result.observed;
    for (const id of result.evidenceIds) {
      this.found[id] = player.id;
      this.#record(`${player.name} found ${clues[id].title.toLowerCase()}.`);
    }
    return this.#complete(player, requestId, {
      ok: true,
      message: result.message,
      objectId,
      observed: result.observed,
    });
  }

  async #beginInterview(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "begin" }>,
  ): Promise<ActionResult> {
    const npc = getCharacter(action.npcId);
    if (!this.#activeNpcIds().includes(npc.id))
      return {
        ok: false,
        message: "That person is not available in this chapter.",
      };
    if (npc.location !== player.location)
      return {
        ok: false,
        message: "Meet the witness at their location first.",
      };
    if (this.turns.some(turn => turn.npcId === npc.id && turn.status === "pending" && turn.playerId !== player.id))
      return { ok: false, message: `${npc.name} is still replying to your partner.` };
    if (interviewEnded(this.#character(npc.id).view()))
      return {
        ok: false,
        message: "This interview is finished. Review the case report.",
      };
    const held = this.npcViews.find(
      (n) =>
        n.lease?.playerId === player.id &&
        n.lease.until > Date.now() &&
        n.id !== npc.id,
    );
    if (held)
      return { ok: false, message: "Finish your current conversation first." };
    const acquired = this.#character(npc.id).acquire(player.id);
    if (acquired.ok) {
      const entered = await this.scenes
        .scene(this.#caseId(), player.location)
        .beginInteraction(
          player.id,
          player.positionEpoch ?? 0,
          npc.id,
          acquired.view.lease!.until,
        );
      if (!entered.ok) return entered;
    }
    this.#updateNpc(acquired.view);
    if (acquired.ok && !npc.mind)
      this.#speak(requestId, player, npc, { kind: "greeting" });
    return this.#complete(player, requestId, {
      ok: acquired.ok,
      message: acquired.ok
        ? `You are speaking with ${npc.name}.`
        : `${npc.name} is speaking with your partner. Explore another lead while they talk.`,
    });
  }

  async #endInterview(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "end" }>,
  ): Promise<ActionResult> {
    getCharacter(action.npcId);
    if (!this.#activeNpcIds().includes(action.npcId))
      return {
        ok: false,
        message: "That conversation belongs to another chapter.",
      };
    if (!this.travelOrders[player.id])
      await this.scenes
        .scene(this.#caseId(), player.location)
        .setInteraction(player.id, player.positionEpoch ?? 0, null);
    this.#journal().cancelFor(player.id);
    this.#updateNpc(this.#character(action.npcId).release(player.id));
    return this.#complete(player, requestId, {
      ok: true,
      message:
        this.mode === "solo"
          ? "Conversation finished."
          : "Conversation finished. Your partner can speak with them now.",
    });
  }

  #askQuestion(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "ask" }>,
  ): ActionResult {
    const result: ActionResult = { ok: true, message: "" };
    const npc = getCharacter(action.npcId);
    const current = this.npcViews.find((n) => n.id === npc.id);
    const topic = npc.topics.find((t) => t.id === action.topicId);
    if (
      !current ||
      npc.location !== player.location ||
      current.lease?.playerId !== player.id ||
      current.lease.until <= Date.now()
    )
      return {
        ok: false,
        message: "Speak to the witness before asking a question.",
      };
    if (
      !topic ||
      !topicAvailable(topic, current, Object.keys(this.found), this.#facts())
    )
      return { ok: false, message: "That question is not available yet." };
    if (topic.documentId)
      return this.#answerQuestion(player, requestId, {
        ...action,
        type: "answer",
        approach: "reassure",
      });
    this.#updateNpc(this.#character(npc.id).renew(player.id));
    this.#speak(requestId, player, npc, { kind: "ask", topicId: topic.id });
    return this.#complete(player, requestId, result);
  }

  #answerQuestion(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "answer" }>,
  ): ActionResult {
    const npc = getCharacter(action.npcId);
    const rejection = this.#answerRejection(player, npc, action);
    if (rejection) return { ok: false, message: rejection };
    const answered = this.#character(npc.id).answer(
      player.id,
      requestId,
      action.topicId,
      action.approach,
      action.evidenceId,
    );
    this.#updateNpc(answered.view);
    const result = answered.reply
      ? this.#recordAnswer(player, requestId, npc, answered.reply)
      : {
          ok: false,
          message: "Your conversation has ended. Speak to the witness again.",
        };
    return this.#complete(player, requestId, result);
  }

  #deduce(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "deduce" }>,
  ): ActionResult {
    if (action.evidenceIds.some((id) => !this.found[id]))
      return {
        ok: false,
        message: "Collect both pieces before connecting them.",
      };
    const deduction = deductions.find(
      (d) =>
        this.#chapter().deductionIds.includes(d.id) &&
        [d.requires, ...(d.alternatives ?? [])].some((pair) =>
          pair.every((id) => action.evidenceIds.includes(id)),
        ),
    );
    if (!deduction) {
      return this.#complete(player, requestId, {
        ok: false,
        message:
          "This pair does not answer a case map question. Read the questions and try another pair.",
      });
    }
    if (!gateOpen(deduction, this.#facts()))
      return this.#complete(player, requestId, {
        ok: false,
        message:
          "This comparison needs the independent account or earlier finding named in the case question.",
      });
    const reconstruction = reconstructionForPair(
      action.evidenceIds,
      activeStory.reconstructions,
    );
    if (
      reconstruction &&
      !this.solvedDeductions.includes(deduction.id) &&
      !validReconstruction(reconstruction, action.sequence)
    )
      return this.#complete(player, requestId, {
        ok: false,
        reconstruction: publicReconstruction(reconstruction),
        message: action.sequence
          ? reconstruction.failure
          : "Reconstruct the events on the Case Map before recording this finding.",
      });
    if (!this.solvedDeductions.includes(deduction.id)) {
      this.solvedDeductions.push(deduction.id);
      this.connectedEvidence[deduction.id] = [...action.evidenceIds];
      this.#record(
        `${player.name} connected the evidence: ${deduction.title}.`,
      );
    }
    return this.#complete(player, requestId, {
      ok: true,
      message: deduction.explanation,
    });
  }

  #writeNote(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "note" }>,
  ): ActionResult {
    if (!action.text.trim() || action.text.length > 500)
      return { ok: false, message: "Write a note of 1–500 characters." };
    this.notes = [
      ...this.notes,
      { id: requestId, playerId: player.id, text: action.text.trim() },
    ].slice(-50);
    return this.#complete(player, requestId, {
      ok: true,
      message:
        this.mode === "solo"
          ? "Note recorded."
          : "Your partner can now read your note.",
    });
  }

  #submitFinalReport(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "finalReport" }>,
  ): ActionResult {
    const rule = this.#chapter().flow.completion;
    if (rule.kind !== "findings" || !this.#ready())
      return {
        ok: false,
        message:
          "Complete the required findings and interviews before submitting this report.",
      };
    if (
      action.findings.some(
        (id) => !rule.options.some((option) => option.id === id),
      )
    )
      return { ok: false, message: "Choose findings from this report." };
    this.votes[player.id] = reportKey(action.findings);
    this.lastFeedback = null;
    const agreement = reportAgreement(
      this.members.map((member) => member.id),
      this.votes,
      this.mode,
    );
    if (agreement !== "agreed")
      return this.#complete(player, requestId, {
        ok: true,
        message:
          agreement === "waiting"
            ? "Your findings are recorded. Your partner must endorse the same report."
            : "Your reports differ. Compare the findings together.",
      });
    if (reportKey(action.findings) !== reportKey(rule.supported)) {
      this.votes = {};
      this.lastFeedback = rule.rejection;
      return this.#complete(player, requestId, {
        ok: false,
        message: this.lastFeedback,
      });
    }
    this.#finishStage();
    return this.#complete(player, requestId, {
      ok: true,
      message: "Report accepted.",
    });
  }

  #submitChapterReport(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "chapterVote" }>,
  ): ActionResult {
    let result: ActionResult = { ok: true, message: "" };
    const chapter = this.#chapter();
    if (
      chapter.flow.completion.kind !== "report" ||
      !chapter.options.some((o) => o.id === action.answer)
    )
      return {
        ok: false,
        message: "Choose a conclusion from this chapter’s report.",
      };
    if (!this.#ready())
      return {
        ok: false,
        message:
          "Complete the case map findings and the outstanding visits listed on the board first.",
      };
    this.votes[player.id] = action.answer;
    this.lastFeedback = null;
    const agreement = reportAgreement(
      this.members.map((member) => member.id),
      this.votes,
      this.mode,
    );
    if (agreement === "waiting")
      result.message =
        "Your conclusion is recorded. Ask your partner to review the chapter report.";
    else if (agreement === "different")
      result.message =
        "Your conclusions differ. Compare the evidence; either investigator can revise their answer.";
    else if (!chapter.acceptedAnswers.includes(action.answer)) {
      this.votes = {};
      result = {
        ok: false,
        message:
          "Your evidence does not support that conclusion. Review the case map questions and choose again.",
      };
      this.lastFeedback = result.message;
    } else {
      if (chapter.decision) this.decisions[chapter.decision] = action.answer;
      this.#finishStage(action.answer);
      result.message =
        "A new chapter has opened. Your previous discoveries remain in the archive.";
    }
    return this.#complete(player, requestId, result);
  }

  async #heartbeat(player: Member): Promise<ActionResult> {
    const held = this.npcViews.filter(
      (npc) =>
        npc.lease?.playerId === player.id && npc.lease.until > Date.now(),
    );
    for (const npc of held)
      this.#updateNpc(this.#character(npc.id).renew(player.id));
    if (held.length) await this.#syncInteraction(player);
    return { ok: true, message: "" };
  }

  #answerRejection(
    player: Player,
    npc: ReturnType<typeof getCharacter>,
    action: Extract<Action, { type: "answer" }>,
  ): string | undefined {
    if (!this.#activeNpcIds().includes(npc.id))
      return "That person is not available in this chapter.";
    if (npc.location !== player.location)
      return "You must be with the witness to ask a question.";
    if (action.evidenceId && !this.found[action.evidenceId])
      return "You have not collected that evidence.";
    const topic = npc.topics.find((t) => t.id === action.topicId);
    const current = this.npcViews.find((n) => n.id === npc.id)!;
    if (
      !topic ||
      !topicAvailable(topic, current, Object.keys(this.found), this.#facts())
    )
      return "You have no evidence for that follow-up yet.";
    if (npc.repeatable === false && topicReply(current, topic.id))
      return "That question has been answered. The reply is in your interview record.";
    if (
      topic.choices?.find((c) => c.approach === action.approach)
        ?.usesEvidence &&
      !action.evidenceId
    )
      return "Choose evidence to support your question.";
  }

  #recordAnswer(
    player: Player,
    requestId: string,
    npc: ReturnType<typeof getCharacter>,
    reply: Reply,
  ): ActionResult {
    if (reply.id === requestId)
      this.#speak(requestId, player, npc, { kind: "reply", reply });
    for (const reward of new Set([
      reply.reward,
      ...(reply.disclosures?.map((item) => item.reward) ?? []),
    ])) {
      if (!reward || this.found[reward]) continue;
      this.found[reward] = player.id;
      this.#record(`${player.name} learned: ${clues[reward].title}.`);
    }
    if (reply.success)
      for (const choice of [
        reply.choice,
        ...(reply.disclosures?.map((item) => item.choice) ?? []),
      ]) {
        if (choice) this.decisions[choice.id] = choice.value;
      }
    return {
      ok: true,
      message: reply.conversational
        ? "Conversation saved."
        : reply.success
          ? "Statement saved in your shared interview record."
          : "The answer is recorded. Check the source or the available follow-up before returning to this question.",
      reply,
    };
  }

  #finishStage(answer = "") {
    const chapter = this.#chapter();
    this.chapterReports.push({
      title: chapter.title,
      text: chapter.reportByAnswer[answer] ?? chapter.report,
    });
    this.votes = {};
    this.lastFeedback = null;
    this.#releaseAllConversations();
    const { target, cutscene } = chapter.flow.after;
    if (cutscene) this.#startCutscene(cutscene, target);
    else this.#transition(target);
  }

  #transition(target: TransitionTarget) {
    this.epoch++;
    if (target === "finish") {
      this.phase = "solved";
      for (const member of this.members)
        this.#resetPosition(member, member.location, member.position);
      this.#record("The enquiry is complete.");
      return;
    }
    if (target === "advance") {
      if (!campaign[this.chapterIndex + 1])
        throw new Error(
          "This stage has no successor. Use a finish transition.",
        );
      this.chapterIndex++;
      this.reportAccepted = false;
      this.#enterChapter();
      return;
    }
    this.phase = "investigating";
    if (target === "epilogue") this.reportAccepted = true;
    const entry = this.reportAccepted
      ? this.#chapter().flow.epilogue!.entry
      : this.#chapter().flow.entry;
    this.npcViews = this.#chapterCharacters();
    for (const member of this.members) this.#resetPosition(member, entry);
    this.#record(
      target === "epilogue"
        ? this.#chapter().flow.epilogue!.message
        : "Continue the enquiry.",
    );
  }

  #enterChapter() {
    this.epoch++;
    const chapter = this.#chapter();
    this.phase = "investigating";
    this.npcViews = this.#chapterCharacters();
    const entry = stageEntry(chapter.flow, this.#locations());
    for (const member of this.members) this.#resetPosition(member, entry);
    this.#record(chapter.title);
    if (chapter.flow.entryCutscene)
      this.#startCutscene(chapter.flow.entryCutscene, "resume");
  }

  #startCutscene(id: string, next: TransitionTarget) {
    this.epoch++;
    const scene = cutscenes.find((scene) => scene.id === id);
    if (!scene) throw new Error(`Unknown cutscene: ${id}`);
    this.#releaseAllConversations();
    this.cutscene = startCutscene(scene, randomUUID(), next);
    this.phase = "cutscene";
    for (const member of this.members)
      this.#resetPosition(member, scene.location);
  }

  #checkEpilogue() {
    const epilogue = this.#chapter().flow.epilogue;
    if (
      !this.reportAccepted ||
      this.phase !== "investigating" ||
      !epilogue ||
      !stageReady(epilogue.requiredEvidence, [], Object.keys(this.found), [])
    )
      return;
    if (epilogue.cutscene) this.#startCutscene(epilogue.cutscene, "finish");
    else this.#transition("finish");
  }

  async #refreshConnections(exclude?: string) {
    this.connectedPlayers = [
      ...new Set(
        (await this.getConnections())
          .filter(
            (connection) =>
              connection.id !== exclude && connection.state !== "closed",
          )
          .map((connection) => connection.metadata.playerId),
      ),
    ];
  }

  #connected() {
    return this.connectedPlayers;
  }

  #resetPosition(
    player: Player,
    location: PlaceId,
    position?: Player["position"],
  ) {
    this.travelOrders[player.id] ??= {
      from: player.positionEpoch ? player.location : null,
      visit: player.positionEpoch ?? 0,
    };
    player.location = location;
    const place = [
      ...this.#locations(),
      ...campaign.flatMap((chapter) => [
        ...chapter.locations,
        ...chapter.epilogueLocations,
      ]),
    ].find((place) => place.id === location);
    if (!place) throw new Error("Unknown scene.");
    player.position =
      position ??
      inspectorSpawn(
        activeStory.inspectors.findIndex(
          (inspector) => inspector.id === player.role,
        ),
        place.navigation,
      );
    player.positionEpoch = (player.positionEpoch ?? 0) + 1;
    player.motion = { at: Date.now(), moving: false, heading: 0 };
    player.gesture = null;
    player.activity = "investigating";
  }

  #releaseConversations(playerId: string) {
    this.#journal().cancelFor(playerId);
    for (const npc of this.npcViews.filter(
      (npc) => npc.lease?.playerId === playerId,
    )) {
      this.#updateNpc(this.#character(npc.id).release(playerId));
    }
  }

  #chapterCharacters() {
    const current = characters
      .filter((npc) =>
        [...this.#chapter().npcIds, ...this.#chapter().epilogueNpcIds].includes(
          npc.id,
        ),
      )
      .map((npc) => this.#character(npc.id).view());
    return mergeInterviewRecords(this.npcViews, current);
  }

  #restoreChapterCharacters() {
    this.npcViews = characters
      .filter(
        (npc) =>
          this.appearances[npc.id] ||
          [
            ...this.#chapter().npcIds,
            ...this.#chapter().epilogueNpcIds,
          ].includes(npc.id),
      )
      .map((npc) => this.#character(npc.id).view());
  }

  #complete(
    player: Member,
    requestId: string,
    result: ActionResult,
  ): ActionResult {
    this.#checkEpilogue();
    const speech = this.speech.find(
      (item) => item.id === requestId && item.playerId === player.id,
    );
    if (speech) result = { ...result, speech };
    this.requests.push({ id: requestId, playerId: player.id, result });
    this.requests = this.requests.slice(-120);
    this.#notify();
    return result;
  }

  #speak(
    requestId: string,
    player: Player,
    npc: ReturnType<typeof getCharacter>,
    subject: SpeechSubject,
  ) {
    const now = Date.now();
    this.speech = this.speech.filter(
      (s) => s.npcId !== npc.id && s.playerId !== player.id && s.endsAt > now,
    );
    this.speech.push(
      createInterviewSpeech(
        requestId,
        player,
        npc,
        this.chapterIndex,
        subject,
        now + 180,
        activeStory.voices,
      ),
    );
  }
  #character(id: string) {
    const npc = getCharacter(id);
    return new CharacterState(npc, systemClock, {
      ...new CharacterState(npc, systemClock).view(),
      ...this.appearances[id],
    });
  }
  #chapter() {
    return campaign[this.chapterIndex];
  }
  #ready() {
    return (
      this.phase === "investigating" &&
      !this.reportAccepted &&
      chapterProgress(
        this.#chapter(),
        Object.keys(this.found),
        this.solvedDeductions,
        this.npcViews,
      ).ready
    );
  }

  #guidance() {
    const guidance = investigationGuidance(
      this.#chapter(),
      this.#facts(),
      this.hintLevels[this.chapterIndex],
      this.leadClaims[this.chapterIndex],
    );
    const places = this.#locations().map((place) => place.id);
    return {
      ...guidance,
      leads: guidance.leads.filter(
        (lead) => !lead.location || places.includes(lead.location),
      ),
    };
  }

  #leadAction(
    player: Member,
    requestId: string,
    action: Extract<Action, { type: "hint" | "followLead" }>,
  ) {
    const lead = this.#guidance().leads.find(
      (lead) => lead.id === action.leadId,
    );
    if (!lead || lead.complete)
      return { ok: false, message: "That lead is not open." };
    if (action.type === "hint") {
      const levels = (this.hintLevels[this.chapterIndex] ??= {});
      levels[lead.id] = Math.min(lead.hintCount, lead.hintLevel + 1);
    } else {
      const claims = (this.leadClaims[this.chapterIndex] ??= {});
      if (claims[lead.id] && claims[lead.id] !== player.id)
        return {
          ok: false,
          message:
            "Your partner is following this lead. You can still help them.",
        };
      if (action.following) claims[lead.id] = player.id;
      else delete claims[lead.id];
    }
    return this.#complete(player, requestId, {
      ok: true,
      message:
        action.type === "hint"
          ? "Hint revealed on the Case Map."
          : "Shared lead updated.",
    });
  }

  #facts() {
    return {
      evidence: Object.keys(this.found),
      deductions: this.solvedDeductions,
      decisions: this.decisions,
      reportAccepted: this.reportAccepted,
    };
  }

  #activeNpcIds() {
    return this.reportAccepted
      ? this.#chapter().epilogueNpcIds
      : this.#chapter().npcIds;
  }

  #releaseAllConversations() {
    for (const member of this.members) this.#releaseConversations(member.id);
    this.speech = [];
  }

  #member(identity: Identity) {
    this.#assertStory();
    const member = this.members.find((p) => p.id === identity.playerId);
    if (!member || !validSecret(identity.secret, member.secretHash))
      throw new Error(
        "Your investigator session is not valid. Rejoin with the original browser.",
      );
    return member;
  }
  #assertStory() {
    if (
      this.storyId !== activeStory.id ||
      this.storyVersion !== activeStory.version
    )
      throw new Error(
        "This case belongs to a different story version. Start a new case.",
      );
  }
  #view(): CaseView {
    this.#assertStory();
    const chapter = this.#chapter();
    this.#restoreChapterCharacters();
    const view: CaseView = {
      roomId: this.#caseId(),
      mode: this.mode,
      storyId: this.storyId,
      storyVersion: this.storyVersion,
      objects: this.#publicObjects(),
      revision: this.revision,
      phase: this.phase,
      connected: this.#connected(),
      ...(this.cutscene ? { cutscene: this.#cutsceneView() } : {}),
      serverTime: Date.now(),
      speech: this.speech.filter(
        (s) => s.chapter === this.chapterIndex && s.endsAt > Date.now(),
      ),
      chapter: this.#chapterSummary(),
      locations: this.#locations(),
      questions: investigationQuestions(chapter, deductions, this.#facts()),
      canConclude: this.#ready(),
      chapterReports: this.chapterReports,
      decisions: this.decisions,
      reportAccepted: this.reportAccepted,
      guidance: this.#guidance(),
      progress: chapterProgress(
        chapter,
        Object.keys(this.found),
        this.solvedDeductions,
        this.npcViews,
      ),
      outstanding: this.#guidance()
        .leads.filter((lead) => !lead.complete)
        .map((lead) => lead.title),
      players: this.members.map(({ secretHash: _, ...p }) => p),
      evidence: Object.entries(this.found).map(([id, foundBy]) => ({
        ...this.#evidence(id),
        foundBy,
      })),
      inspections: Object.fromEntries(
        Object.values(physicalObjects)
          .map((object) => [
            object.id,
            observedObjectSteps(
              object,
              this.inspections,
              Object.keys(this.found),
            ),
          ])
          .filter(([, steps]) => steps.length > 0),
      ),
      deductions: this.solvedDeductions,
      connections: revealedConnections(
        deductions,
        this.solvedDeductions,
        Object.keys(this.found),
        this.connectedEvidence,
      ),
      npcs: this.#visibleCharacters().map((npc) => {
        const pending = this.turns.find(
          (turn) => turn.npcId === npc.id && turn.status === "pending",
        );
        return {
          ...npc,
          intelligent: !!getCharacter(npc.id).mind,
          ...(pending
            ? {
                pendingTurn: {
                  id: pending.id,
                  playerId: pending.playerId,
                  action: pending.action,
                },
              }
            : {}),
        };
      }),
      log: this.log,
      notes: this.notes,
      votes: this.votes,
      ending: this.phase === "solved" ? endingText : null,
      lastFeedback: this.lastFeedback,
    };
    if (this.phase !== "lobby") return view;
    return {
      ...view,
      chapter: {
        index: 0,
        total: 0,
        title: "",
        date: "",
        opening: "",
        goal: "",
        question: "",
        options: [],
      },
      locations: [],
      questions: [],
      evidence: [],
      npcs: [],
      log: [],
      objects: {},
      inspections: {},
      outstanding: [],
      guidance: undefined,
      progress: undefined,
    };
  }
  #evidence(id: string) {
    const evidence = clues[id];
    const statements =
      evidence.kind === "testimony"
        ? testimonyStatements(
            id,
            Object.keys(this.found),
            this.npcViews,
            this.members,
          )
        : [];
    return {
      ...evidence,
      document: evidence.documentId
        ? activeStory.documents[evidence.documentId]
        : undefined,
      ...(statements.length ? { statements } : {}),
    };
  }
  #publicObjects() {
    const hotspots = this.#locations().flatMap((place) =>
      place.hotspots.map((hotspot) => hotspot.id),
    );
    return Object.fromEntries(
      Object.values(physicalObjects)
        .filter(
          (object) =>
            object.hotspots.some((id) => hotspots.includes(id)) ||
            object.evidence.some((item) => this.found[item.id]),
        )
        .map((object) => {
          const observed = observedObjectSteps(
            object,
            this.inspections,
            Object.keys(this.found),
          );
          return [
            object.id,
            {
              ...object,
              steps: object.steps.map((step) => ({
                ...step,
                observation: observed.includes(step.id) ? step.observation : "",
              })),
            },
          ];
        }),
    );
  }
  #cutsceneView(): CaseView["cutscene"] {
    if (!this.cutscene) return;
    const { next: _, ...state } = this.cutscene;
    const definition = cutscenes.find((scene) => scene.id === state.id)!;
    const step = definition.steps[state.index];
    const speakerName =
      step.speakerName ??
      activeStory.inspectors.find((inspector) => inspector.id === step.speaker)
        ?.name ??
      activeStory.characters.find((npc) => npc.id === step.speaker)?.name;
    return {
      ...state,
      title: definition.title,
      location: definition.location,
      step: { ...step, speakerName },
      total: definition.steps.length,
      connected: this.#connected(),
    };
  }
  #chapterSummary(): CaseView["chapter"] {
    const chapter = this.#chapter();
    return {
      index: this.chapterIndex,
      total: campaign.length,
      title: chapter.title,
      date: chapter.date,
      opening: chapter.opening,
      goal: chapter.goal,
      question: chapter.question,
      options: chapter.options,
      reviewEvidence: chapter.reviewEvidence,
      completion: completionView(chapter.flow.completion),
      briefing: chapter.briefing
        ? activeStory.documents[chapter.briefing]
        : undefined,
      epilogueMessage: chapter.flow.epilogue?.message,
    };
  }

  #locations(): CaseView["locations"] {
    if (this.cutscene) {
      const scene = cutscenes.find((scene) => scene.id === this.cutscene!.id)!;
      const current = this.#chapter();
      const place = [
        ...current.locations,
        ...current.epilogueLocations,
        ...campaign.flatMap((chapter) => [
          ...chapter.locations,
          ...chapter.epilogueLocations,
        ]),
      ].find((place) => place.id === scene.location);
      if (!place)
        throw new Error(`Unknown cutscene location: ${scene.location}`);
      return [{ ...place, hotspots: [] }];
    }
    const chapter = this.#chapter();
    const places = this.reportAccepted
      ? chapter.epilogueLocations
      : chapter.locations.filter((place) => gateOpen(place, this.#facts()));
    return places.map((place) => ({
      ...place,
      hotspots: place.hotspots.filter(
        (hotspot) => !hotspot.hideWhenFound || !this.found[hotspot.id],
      ),
    }));
  }

  #visibleCharacters(): NpcView[] {
    if (this.cutscene) {
      const step = cutscenes.find((scene) => scene.id === this.cutscene!.id)!
        .steps[this.cutscene.index];
      const cast = [
        step.speaker,
        ...(step.actors?.map((actor) => actor.id) ?? []),
      ];
      return activeStory.characters
        .filter((npc) => cast.includes(npc.id))
        .map((npc) => ({
          ...new CharacterState(npc, systemClock).view(),
          topics: [],
          greeting: "",
          historical: "",
        }));
    }
    return this.npcViews
      .filter(
        (n) =>
          this.#activeNpcIds().includes(n.id) &&
          this.#locations().some((place) => place.id === n.location),
      )
      .map((n) => ({
        ...n,
        topics: publicTopics(getCharacter(n.id)).filter((t) =>
          topicAvailable(t, n, Object.keys(this.found), this.#facts()),
        ),
        lease: n.lease && n.lease.until > Date.now() ? n.lease : null,
      }));
  }

  #record(text: string) {
    this.log.unshift({
      id: `${Date.now()}-${this.revision}-${this.log.length}`,
      text,
      at: Date.now(),
    });
    this.log = this.log.slice(0, 60);
  }
  #updateNpc(view: NpcView) {
    this.appearances[view.id] = {
      trust: view.trust,
      replies: view.replies,
      lease: view.lease,
    };
    this.npcViews = [
      ...this.npcViews.filter((npc) => npc.id !== view.id),
      view,
    ];
  }
  #notify() {
    this.revision++;
    this.broadcast({ type: "update", state: wire(this.#view()) });
  }

  async sceneSession(
    identity: Identity,
  ): Promise<{ location: string; visit: number }> {
    const player = this.#member(identity);
    await this.#flushTravel();
    return { location: player.location, visit: player.positionEpoch ?? 0 };
  }

  #caseId() {
    return caseIdFromActorId(this.id);
  }

  async #flushTravel() {
    for (const [playerId, order] of Object.entries(this.travelOrders)) {
      const player = this.members.find((member) => member.id === playerId)!;
      if (order.from && order.from !== player.location)
        await this.scenes
          .scene(this.#caseId(), order.from)
          .leave(player.id, order.visit);
      await this.scenes
        .scene(this.#caseId(), player.location)
        .ensureVisit(
          {
            caseId: this.#caseId(),
            location: player.location,
            chapter: this.chapterIndex,
            epoch: this.epoch,
            phase: this.phase,
          },
          {
            playerId: player.id,
            secretHash: player.secretHash,
            visit: player.positionEpoch ?? 0,
            position: player.position,
          },
        );
      delete this.travelOrders[playerId];
    }
  }

  async #refreshPosition(player: Member) {
    await this.#readScene(player.location);
  }

  async #readScene(location: string) {
    const scene = await this.scenes.scene(this.#caseId(), location).snapshot();
    for (const player of this.members.filter(
      (member) => member.location === location,
    )) {
      const position = scene.positions[player.id];
      if (position?.visit === player.positionEpoch)
        Object.assign(player, {
          position: position.position,
          motion: position.motion,
          gesture: position.gesture,
        });
    }
  }

  async #syncInteraction(player: Member) {
    if (this.travelOrders[player.id]) return;
    const held = this.npcViews.find(
      (npc) =>
        npc.lease?.playerId === player.id && npc.lease.until > Date.now(),
    );
    await this.scenes
      .scene(this.#caseId(), player.location)
      .setInteraction(
        player.id,
        player.positionEpoch ?? 0,
        held?.id ?? null,
        held?.lease?.until,
      );
  }
}
