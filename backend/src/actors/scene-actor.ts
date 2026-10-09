import {
  Actor,
  Compute,
  Ephemeral,
  Persisted,
  type ActorSocket,
} from "terse-sdk/actor";
import { waveProgress } from "../../../shared/game/gestures.js";
import {
  closeEnoughToSpeak,
  walkable,
  witnessPosition,
  type Point,
} from "../../../shared/game/navigation.js";
import type {
  SceneCommand,
  SceneEntry,
  SceneEvent,
  SceneIdentity,
  ScenePosition,
  SceneScope,
  SceneView,
} from "../../../shared/game/scene-socket.js";
import type { Action, ActionResult } from "../../../shared/game/types.js";
import { activeStory } from "../active-story.js";
import { commandSchema } from "../cases/commands.js";
import { systemClock, type Clock } from "../clock.js";
import { entityActorId, validSecret, wire } from "./entity-identity.js";

type Occupant = ScenePosition & {
  secretHash: string;
  movedAt: number;
  interaction: string | null;
  interactionUntil: number;
};

@Compute({ idleTimeoutMs: 5000 })
export class SceneActor extends Actor<SceneIdentity, SceneCommand, SceneEvent> {
  @Persisted private scope: SceneScope | null = null;
  @Persisted private occupants: Record<string, Occupant> = {};
  @Persisted private departed: Record<string, number> = {};
  @Persisted private revision = 0;
  @Ephemeral private clock: Clock;

  protected constructor(clock: Clock = systemClock) {
    super();
    this.clock = clock;
  }

  async ensureVisit(scope: SceneScope, entry: SceneEntry): Promise<void> {
    await this.configure(scope);
    await this.enter(entry);
  }

  async beginInteraction(
    playerId: string,
    visit: number,
    npcId: string,
    until: number,
  ): Promise<ActionResult> {
    const occupant = this.occupants[playerId];
    if (!occupant || occupant.visit !== visit)
      throw new Error("That scene visit has ended.");
    const npc = activeStory.characters.find(
      (character) => character.id === npcId,
    );
    if (
      this.scope?.phase !== "investigating" ||
      npc?.location !== this.scope.location
    )
      return {
        ok: false,
        message: "Meet the witness at their location first.",
      };
    if (
      !closeEnoughToSpeak(
        occupant.position,
        witnessPosition(npc.id, this.#place().navigation),
      )
    )
      return { ok: false, message: `Walk closer to ${npc.name} to speak.` };
    await this.setInteraction(playerId, visit, npcId, until);
    return { ok: true, message: "" };
  }

  async configure(scope: SceneScope): Promise<void> {
    if (this.id !== entityActorId(scope.caseId, scope.location))
      throw new Error("Scene belongs to another case.");
    if (this.scope && scope.epoch < this.scope.epoch)
      throw new Error("That scene belongs to an earlier stage.");
    const changed = JSON.stringify(this.scope) !== JSON.stringify(scope);
    this.scope = scope;
    this.#place();
    if (changed) this.#publish();
  }

  async enter(entry: SceneEntry): Promise<void> {
    const previous = this.occupants[entry.playerId];
    if (previous && previous.visit >= entry.visit) return;
    if ((this.departed[entry.playerId] ?? -1) >= entry.visit)
      throw new Error("That scene visit has ended.");
    const place = this.#place();
    if (!walkable(entry.position, place.indoor, place.navigation))
      throw new Error("Scene entry is not walkable.");
    this.occupants[entry.playerId] = {
      visit: entry.visit,
      secretHash: entry.secretHash,
      position: entry.position,
      movedAt: 0,
      interaction: null,
      interactionUntil: 0,
      gesture: null,
      motion: { at: this.clock.now(), moving: false, heading: 0 },
    };
    this.#publish();
  }

  async leave(playerId: string, visit: number): Promise<void> {
    this.departed[playerId] = Math.max(this.departed[playerId] ?? -1, visit);
    if (this.occupants[playerId]?.visit !== visit) return;
    delete this.occupants[playerId];
    this.#publish();
  }

  async setInteraction(
    playerId: string,
    visit: number,
    npcId: string | null,
    until?: number,
  ): Promise<void> {
    const occupant = this.occupants[playerId];
    if (!occupant || occupant.visit !== visit)
      throw new Error("That scene visit has ended.");
    occupant.interaction = npcId;
    occupant.interactionUntil = npcId
      ? (until ?? this.clock.now() + 90_000)
      : 0;
    if (npcId) occupant.gesture = null;
  }

  async move(
    identity: SceneIdentity,
    action: Extract<Action, { type: "move" }>,
  ): Promise<ActionResult> {
    const occupant = this.#member(identity);
    if (this.scope?.phase !== "investigating")
      return { ok: false, message: "Movement is unavailable in this stage." };
    if (occupant.interaction && occupant.interactionUntil > this.clock.now())
      return {
        ok: false,
        message: "Finish your conversation before walking away.",
      };
    const place = this.#place(),
      next = { x: action.x, z: action.z };
    if (
      !Number.isFinite(next.x) ||
      !Number.isFinite(next.z) ||
      !walkable(next, place.indoor, place.navigation)
    )
      return {
        ok: false,
        message: "That position is outside the walkable scene.",
      };
    this.#limitStep(occupant, next);
    if (!walkable(next, place.indoor, place.navigation))
      return { ok: false, message: "That position is obstructed." };
    const dx = next.x - occupant.position.x,
      dz = next.z - occupant.position.z;
    occupant.motion = {
      at: this.clock.now(),
      moving: action.moving ?? false,
      heading:
        action.heading ??
        (Math.hypot(dx, dz) > 0.001
          ? Math.atan2(dx, dz)
          : occupant.motion.heading),
    };
    occupant.position = next;
    if (action.moving) occupant.gesture = null;
    occupant.movedAt = this.clock.now();
    this.#publish();
    return { ok: true, message: "" };
  }

  async wave(
    identity: SceneIdentity,
    action: Extract<Action, { type: "wave" }>,
  ): Promise<ActionResult> {
    const occupant = this.#member(identity);
    if (!Number.isFinite(action.heading))
      return { ok: false, message: "Invalid wave direction." };
    if (
      this.scope?.phase !== "investigating" ||
      (occupant.interaction && occupant.interactionUntil > this.clock.now())
    )
      return {
        ok: false,
        message: "Finish the conversation or scene before waving.",
      };
    if (waveProgress(occupant.gesture, this.clock.now()) !== null)
      return { ok: false, message: "Already waving." };
    const heading = Math.atan2(
      Math.sin(action.heading),
      Math.cos(action.heading),
    );
    occupant.gesture = { kind: "wave", at: this.clock.now(), heading };
    occupant.motion = { at: this.clock.now(), moving: false, heading };
    this.#publish();
    return { ok: true, message: "" };
  }

  async snapshot(): Promise<SceneView> {
    return this.#view();
  }

  async onConnect(
    socket: ActorSocket<SceneIdentity, SceneEvent>,
  ): Promise<void> {
    this.#member(socket.metadata);
    socket.send({ type: "scene", state: wire(this.#view()) });
  }

  async onMessage(
    socket: ActorSocket<SceneIdentity, SceneEvent>,
    message: SceneCommand,
  ): Promise<void> {
    const command = commandSchema.safeParse(message);
    if (!command.success) return;
    const { requestId, action } = command.data;
    let result: ActionResult;
    try {
      this.#member(socket.metadata);
      result =
        action.type === "move"
          ? await this.move(socket.metadata, action)
          : action.type === "wave"
            ? await this.wave(socket.metadata, action)
            : action.type === "heartbeat"
              ? { ok: true, message: "" }
              : { ok: false, message: "That action belongs to the case." };
    } catch (error) {
      result = {
        ok: false,
        message:
          error instanceof Error ? error.message : "Reconnect to this scene.",
      };
    }
    socket.send({ type: "result", requestId, result: wire(result) });
  }

  #member(identity: SceneIdentity) {
    const occupant = this.occupants[identity.playerId];
    if (!occupant || occupant.visit !== identity.visit)
      throw new Error("That scene visit has ended.");
    if (!validSecret(identity.secret, occupant.secretHash))
      throw new Error("Your investigator session is not valid.");
    return occupant;
  }

  #limitStep(occupant: Occupant, next: Point) {
    const distance = Math.hypot(
      next.x - occupant.position.x,
      next.z - occupant.position.z,
    );
    const allowed = occupant.movedAt
      ? Math.max(
          1,
          Math.min(30, ((this.clock.now() - occupant.movedAt) / 1000) * 5 + 1),
        )
      : 30;
    if (distance <= allowed) return;
    next.x =
      occupant.position.x +
      ((next.x - occupant.position.x) * allowed) / distance;
    next.z =
      occupant.position.z +
      ((next.z - occupant.position.z) * allowed) / distance;
  }

  #place() {
    const chapter = this.scope && activeStory.chapters[this.scope.chapter];
    const places =
      this.scope?.phase === "cutscene"
        ? activeStory.chapters.flatMap((chapter) => [
            ...chapter.locations,
            ...chapter.epilogueLocations,
          ])
        : chapter
          ? [...chapter.locations, ...chapter.epilogueLocations]
          : [];
    const place = places.find((place) => place.id === this.scope!.location);
    if (!place) throw new Error("Unknown scene.");
    return place;
  }

  #view(): SceneView {
    if (!this.scope) throw new Error("Scene is not initialized.");
    return {
      location: this.scope.location,
      epoch: this.scope.epoch,
      revision: this.revision,
      positions: Object.fromEntries(
        Object.entries(this.occupants).map(
          ([id, { visit, position, motion, gesture }]) => [
            id,
            { visit, position, motion, gesture },
          ],
        ),
      ),
    };
  }

  #publish() {
    this.revision++;
    this.broadcast({ type: "scene", state: wire(this.#view()) });
  }
}
