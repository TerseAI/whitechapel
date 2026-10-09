import type { CutsceneStep } from '../../shared/game/cutscenes';
import type { SceneLayout } from '../../shared/game/navigation';
import { useStory } from './story/StoryProvider';
import { SceneSet } from './scenes/SceneSet';
import { Component, Suspense, createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html, OrbitControls, useTexture } from '@react-three/drei';
import { RepeatWrapping, SRGBColorSpace, Vector3, Group, MeshStandardMaterial, CanvasTexture, PCFShadowMap, PerspectiveCamera, type Mesh, type PointLight } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Check, Hand, MessageCircle, Plus, Star, X } from 'lucide-react';
import { MOVEMENT_INTERVAL_MS, RemoteMovement } from './game/movement';
import type { ActionResult, GamePlace, NpcView, Player } from '../../shared/game/types';
import { closeEnoughToInspect, readyToInterview, cluePosition, pathToClue, pathToWitness, stepAlongPath, walkable, witnessPosition, WALK_SPEED, type ApproachTarget, type Point } from '../../shared/game/navigation';
import { witnessPatrol, WITNESS_ATTENTION_DISTANCE, WITNESS_RETURN_SPEED } from './game/witness-pacing';
import { serverNow } from '../../shared/game/interview-speech';
import { type CharacterAppearance } from './game/character-appearance';
import { ChimneySmoke, GaslampHalo, OutdoorAtmosphere, outdoorFog } from './atmosphere/OutdoorAtmosphere';
import { objectForHotspot, observedObjectSteps, type PhysicalObject, type ObjectInspections } from '../../shared/game/physical-objects';
import { witnessPose } from './game/witness-pose';
import type { WitnessPosture, HatPlacement } from '../../shared/story/types';
import { ObjectModel } from './objects/ObjectModel';
import { PeriodCostume, PeriodHair } from './characters/PeriodCostume';
import { InterviewNotes } from './characters/InterviewNotes';
import { characterLabelHeight } from './game/character-label';
import { interviewFieldOfView, interviewView, interviewWitness } from './game/interview-staging';

import { waveProgress, type Gesture } from '../../shared/game/gestures';
import { faceCameraHeading, waveArmPose } from './game/wave-animation';

const ReducedMotion = createContext(false);
type Props = { objects?: Record<string, PhysicalObject>; cinematic?: CutsceneStep; place: GamePlace; player: Player; partner?: Player; npcs: NpcView[]; found: string[]; inspections?: ObjectInspections; talking: string | null; speakingId?: string | null; approaching: ApproachTarget | null; paused: boolean; serverTime?: number; receivedAt?: number; onArrive: (approach: ApproachTarget, position: Point, heading: number) => void; onCancelApproach: () => void; onInspect: (id: string) => void; onTalk: (npc: NpcView) => void; onMove: (x: number, z: number, moving: boolean, heading: number) => Promise<ActionResult>; onWave?: (heading: number) => Promise<ActionResult>; onReady?: () => void };
const npcPoint = (id: string, layout?: SceneLayout): [number, number, number] => { const p = witnessPosition(id, layout); return [p.x, 0, p.z]; };
const cluePoint = (i: number, indoor: boolean, clueId: string, layout?: SceneLayout): [number, number, number] => {
  const authored = layout?.clues?.[clueId];
  if (authored) return authored;
  const point = cluePosition(i, indoor, layout, clueId);
  return [point.x, .75, point.z];
};
function approachDestination(props: Props) {
  const request = props.approaching; if (!request) return null;
  const index = request.kind === 'witness' ? props.npcs.findIndex(n => n.id === request.id) : props.place.hotspots.findIndex(h => h.id === request.id);
  if (index < 0) return null;
  return request.kind === 'witness' ? witnessPosition(request.id, props.place.navigation) : cluePosition(index, props.place.indoor, props.place.navigation, request.id);
}

const seeded = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

class RenderBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }; static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function World3D(props: Props) {
  const [waveRequest, setWaveRequest] = useState(0);
  const [controlsDismissed, setControlsDismissed] = useState(() => {
    try { return localStorage.getItem('investigation.controls-dismissed') === 'true'; } catch { return false; }
  });
  const dismissControls = () => {
    setControlsDismissed(true);
    try { localStorage.setItem('investigation.controls-dismissed', 'true'); } catch { /* Dismiss for this visit if storage is unavailable. */ }
  };
  const [ready, setReady] = useState(false); const [supported] = useState(() => { try { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl2'); if (!gl) return false; gl.getExtension('WEBGL_lose_context')?.loseContext(); return true; } catch { return false; } });
  const fallback = props.cinematic ? <CutsceneFallback onReady={props.onReady}/> : <div className="scene-art"><div className="render-fallback"><p>3D is unavailable. Use the evidence list and witness buttons.</p><div className="fallback-evidence" role="group" aria-label="Evidence in this scene">{props.place.hotspots.map(clue => <button key={clue.id} className="text-button" onClick={() => props.onInspect(clue.id)}>{props.found.includes(clue.id) ? <Check size={16}/> : <Plus size={16}/>} {clue.label}</button>)}{props.npcs.map(npc => <button key={npc.id} className="text-button" onClick={() => props.onTalk(npc)} disabled={!!npc.lease && npc.lease.playerId !== props.player.id}><MessageCircle size={16}/>{npc.name}</button>)}</div></div><FallbackApproach {...props}/></div>;
  useEffect(() => { if (!supported) props.onReady?.(); }, [supported]);
  if (!supported) return props.cinematic ? <div className="scene-art"/> : fallback;
  return <div className={`world-3d ${props.talking ? 'interviewing' : ''}`} data-site={props.place.siteId} data-ready={ready} aria-label={`Interactive 3D scene: ${props.place.name}`}>
    <RenderBoundary fallback={fallback}><Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 5.5, 17], fov: 48, near: .1, far: 90 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.setClearColor('#283a46'); gl.shadowMap.type = PCFShadowMap; }} fallback={<span>Interactive investigation scene</span>}>
      <Suspense fallback={null}><Scene waveRequest={waveRequest} key={`${props.place.id}-${props.place.name}-${props.player.positionEpoch ?? 0}`} {...props} onReady={() => { setReady(true); props.onReady?.(); }}/></Suspense>
    </Canvas></RenderBoundary>
    {!props.cinematic && !props.talking && !props.paused && props.onWave && <button className="wave-control" onClick={() => setWaveRequest(value => value + 1)} disabled={!ready} title="Wave (G)"><Hand size={18}/><span>Wave</span><kbd>G</kbd></button>}
    {!ready && <div className="world-loading" role="status">Loading game</div>}
    {!controlsDismissed && !props.cinematic && <div className="world-controls">
      <details><summary>Controls</summary><p>Click to walk · WASD to move<br/>Drag to look · Scroll to zoom · G to wave<br/>Click a person or clue to walk over and investigate.</p></details>
      <button className="dismiss-controls" onClick={dismissControls} aria-label="Hide controls permanently" title="Hide controls permanently"><X size={16}/></button>
    </div>}
  </div>;
}
function CutsceneFallback({ onReady }: { onReady?: () => void }) {
  useEffect(() => { onReady?.(); }, []);
  return <div className="scene-art"/>;
}
function FallbackApproach(props: Props) {
  useEffect(() => {
    const request = props.approaching;
    const destination = approachDestination(props);
    if (!request || !destination || props.paused) return;
    const route = (request.kind === 'witness' ? pathToWitness : pathToClue)(props.player.position, destination, props.place.indoor, props.place.navigation);
    const withinReach = request.kind === 'witness' ? readyToInterview : closeEnoughToInspect;
    let position = { ...props.player.position }; let heading = props.player.motion?.heading ?? 0;
    let sentAt = 0; let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const next = stepAlongPath(position, route, Math.min((now - previous) / 1000, .25) * WALK_SPEED); previous = now;
      if (Math.hypot(next.x - position.x, next.z - position.z) > .001) heading = Math.atan2(next.x - position.x, next.z - position.z);
      position = next;
      if (!route.length) {
        clearInterval(timer);
        if (request.kind === 'witness') heading = Math.atan2(destination.x - position.x, destination.z - position.z);
        if (withinReach(position, destination)) props.onArrive(request, position, heading); else props.onCancelApproach();
      } else if (now - sentAt >= MOVEMENT_INTERVAL_MS) { void props.onMove(position.x, position.z, true, heading); sentAt = now; }
    }, 50);
    return () => clearInterval(timer);
  }, [props.approaching?.requestId, props.place.id, props.paused]);
  return null;
}
function useMaterials() {
  const source = useTexture(['/materials/dark_brick_wall-color.jpg', '/materials/dark_brick_wall-normal.jpg', '/materials/dark_brick_wall-roughness.jpg', '/materials/cobblestone_floor_08-color.jpg', '/materials/cobblestone_floor_08-normal.jpg', '/materials/cobblestone_floor_08-roughness.jpg']);
  return useMemo(() => {
    const copies = source.map((t, i) => { const c = t.clone(); c.wrapS = c.wrapT = RepeatWrapping; c.repeat.set(i < 3 ? 2 : 5, i < 3 ? 3 : 12); c.anisotropy = 4; if (i % 3 === 0) c.colorSpace = SRGBColorSpace; c.needsUpdate = true; return c; });
    return { brick: new MeshStandardMaterial({ map: copies[0], normalMap: copies[1], roughnessMap: copies[2], color: '#c5a28a', roughness: .93 }), cobble: new MeshStandardMaterial({ map: copies[3], normalMap: copies[4], roughnessMap: copies[5], roughness: .5, metalness: .12, color: '#afbfc5' }), textures: copies };
  }, [source]);
}
function Scene(props: Props & { waveRequest: number }) {
  const { place, player, partner, npcs, found, talking, speakingId, approaching, paused, onArrive, onCancelApproach, onInspect, onTalk, onMove, onReady } = props;
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const query = matchMedia('(prefers-reduced-motion: reduce)'); const update = () => setReducedMotion(query.matches); query.addEventListener('change', update); return () => query.removeEventListener('change', update); }, []);
  const materials = useMaterials(); const indoor = place.indoor;
  const story = useStory();
  const investigatorAppearances = Object.fromEntries(story.inspectors.map(inspector => [inspector.id, inspector.appearance]));
  const partnerWitness = partner && interviewWitness(npcs, partner.id, player.location, serverNow(props));
  const partnerInterviewTarget = partnerWitness ? witnessPosition(partnerWitness.id, place.navigation) : undefined;
  const target = useRef(new Vector3(player.position?.x ?? 0, 0, player.position?.z ?? 8)).current;
  const self = useRef<Group>(null); const controls = useRef<OrbitControlsImpl>(null);
  const initialPosition = useRef<[number, number, number]>([target.x, 0, target.z]);
  const initialRotation = useRef<[number, number, number]>([0, player.motion?.heading ?? 0, 0]);
  const heading = useRef(initialRotation.current[1]); const lastSentHeading = useRef(heading.current);
  const face = (angle: number) => { heading.current = angle; if (self.current) self.current.rotation.y = angle; };
  const position = useRef(target.clone()); const keys = useRef(new Set<string>()); const lastSend = useRef(0); const lastSent = useRef(target.clone());
  const manualTarget = useRef(false);
  const route = useRef<Point[]>([]); const arrivalSent = useRef<number | null>(null);
  useEffect(() => {
    route.current = []; arrivalSent.current = null;
    const destination = approachDestination(props);
    if (approaching && destination) route.current = (approaching.kind === 'witness' ? pathToWitness : pathToClue)(position.current, destination, indoor, place.navigation);
    if (!manualTarget.current) target.copy(position.current);
    manualTarget.current = false;
  }, [approaching?.requestId, place.id]);
  const walking = useRef(false); const wasMoving = useRef(false); const interviewWasOpen = useRef(false);
  useEffect(() => () => { if (wasMoving.current) void onMove(position.current.x, position.current.z, false, heading.current); }, []);
  const { camera, size } = useThree();
  const wave = useRef<Gesture | null>(null), wavePose = useRef<number | null>(null), cancelledWave = useRef(-1);
  const startWave = () => {
    if (talking || paused || props.cinematic || !props.onWave || waveProgress(wave.current, Date.now()) !== null) return;
    route.current = []; target.copy(position.current); keys.current.clear(); onCancelApproach();
    const angle = faceCameraHeading(position.current, camera.position);
    const gesture: Gesture = { kind: 'wave', at: Date.now(), heading: angle };
    wave.current = gesture;
    void props.onWave(angle).then(result => { if (!result.ok && wave.current === gesture) wave.current = null; });
  };
  useEffect(() => { if (props.waveRequest) startWave(); }, [props.waveRequest]);
  useEffect(() => {
    if (!player.gesture) wave.current = null;
    if (player.gesture && player.gesture.at > cancelledWave.current) wave.current = { ...player.gesture, at: Date.now() - (serverNow(props) - player.gesture.at) };
  }, [player.gesture?.at]);
  useEffect(() => {
    const shot = props.cinematic?.camera;
    if (shot) { camera.position.set(...shot.position); camera.lookAt(...shot.target); }
    else camera.position.set(0, indoor ? 6.5 : 5.5, 17);
    onReady?.();
    return () => { materials.brick.dispose(); materials.cobble.dispose(); materials.textures.forEach(t => t.dispose()); };
  }, []);
  useEffect(() => {
    const down = (event: KeyboardEvent) => { if ((event.target as HTMLElement)?.matches('input,textarea,select') || talking || paused || (event.target as HTMLElement)?.closest('dialog')) return; if (event.key.toLowerCase() === 'g' && !event.repeat) { event.preventDefault(); startWave(); return; } if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(event.key.toLowerCase())) { event.preventDefault(); keys.current.add(event.key.toLowerCase()); } };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase()); const blur = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [talking, paused]);
  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, .05); const now = clock.elapsedTime;
    wavePose.current = null;
    const fieldOfView = talking || props.cinematic ? interviewFieldOfView(size.width / size.height) : 48;
    if (camera instanceof PerspectiveCamera && camera.fov !== fieldOfView) { camera.fov = fieldOfView; camera.updateProjectionMatrix(); }
    const publish = (moving: boolean) => {
      const turn = heading.current - lastSentHeading.current;
      const changed = lastSent.current.distanceToSquared(position.current) > .000001 || Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))) > .001;
      if ((moving && now - lastSend.current >= MOVEMENT_INTERVAL_MS / 1000 && changed) || (!moving && (wasMoving.current || changed))) {
        void onMove(position.current.x, position.current.z, moving, heading.current);
        lastSent.current.copy(position.current); lastSentHeading.current = heading.current; lastSend.current = now;
      }
      wasMoving.current = moving;
    };
    if (props.cinematic) {
      walking.current = false; keys.current.clear();
      const shot = props.cinematic.camera;
      if (shot) {
        const eye = new Vector3(...shot.position), focus = new Vector3(...shot.target);
        if (reducedMotion) camera.position.copy(eye); else camera.position.lerp(eye, 1 - Math.exp(-delta * 5));
        camera.lookAt(focus);
      }
      return;
    }
    if (paused) { walking.current = false; keys.current.clear(); publish(false); return; }
    if (talking) {
      walking.current = false;
      const index = Math.max(0, npcs.findIndex(n => n.id === talking)); const p = npcPoint(talking, place.navigation);
      const witness = npcs[index];
      const eyeHeight = witnessPose(witness?.posture, witness?.appearance?.height ?? 1).eyeHeight;
      const bystanders = npcs.flatMap(npc => npc.id === talking ? [] : [witnessPosition(npc.id, place.navigation)]);
      if (partner?.location === player.location) bystanders.push(partner.position);
      const framing = interviewView(position.current, { x: p[0], z: p[2] }, investigatorAppearances[player.role].height, eyeHeight, place.navigation?.bounds, bystanders);
      const focus = new Vector3(...framing.target), view = new Vector3(...framing.position);
      face(Math.atan2(p[0] - position.current.x, p[2] - position.current.z)); publish(false);
      if (reducedMotion) camera.position.copy(view); else camera.position.lerp(view, 1 - Math.exp(-delta * 3));
      controls.current?.target.copy(focus); camera.lookAt(focus); interviewWasOpen.current = true;
      return;
    }
    if (interviewWasOpen.current) { const desired = position.current.clone().add(new Vector3(0, 5.5, 9)); if (reducedMotion) camera.position.copy(desired); else camera.position.lerp(desired, 1 - Math.exp(-delta * 4)); if (camera.position.distanceTo(desired) < .1) interviewWasOpen.current = false; }
    const k = keys.current; const dx = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0); const dz = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    if (dx || dz) { wave.current = null; cancelledWave.current = serverNow(props); }
    const waving = waveProgress(wave.current, Date.now());
    if (waving !== null && wave.current) {
      walking.current = false; wavePose.current = waving;
      const angle = Math.atan2(Math.sin(wave.current.heading - heading.current), Math.cos(wave.current.heading - heading.current));
      face(reducedMotion ? wave.current.heading : heading.current + angle * (1 - Math.exp(-delta * 12)));
      wasMoving.current = false; lastSent.current.copy(position.current); lastSentHeading.current = heading.current;
      return;
    }
    if ((dx || dz) && approaching) { route.current = []; onCancelApproach(); }
    const nextStep = route.current.length ? stepAlongPath(position.current, route.current, delta * WALK_SPEED) : null;
    const currentTarget = nextStep ? new Vector3(nextStep.x, 0, nextStep.z) : dx || dz ? position.current.clone().add(new Vector3(dx, 0, dz).normalize().multiplyScalar(2)) : target;
    const difference = currentTarget.clone().sub(position.current); const distance = difference.length(); walking.current = nextStep !== null || distance > .09;
    const frameStart = position.current.clone();
    if (walking.current) {
      const movement = difference.normalize().multiplyScalar(Math.min(distance, delta * WALK_SPEED)); const next = position.current.clone().add(movement);
      const bounds = place.navigation?.bounds ?? { minX: -4.15, maxX: 4.15, minZ: indoor ? -8 : -13, maxZ: 10 };
      next.x = Math.max(bounds.minX, Math.min(bounds.maxX, next.x)); next.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, next.z));
      const blocked = !walkable(next, indoor, place.navigation);
      if (!blocked) { const actual = next.clone().sub(position.current); position.current.copy(next); camera.position.add(actual); }
      if (self.current) self.current.position.copy(position.current);
      face(Math.atan2(difference.x, difference.z));
    }
    walking.current = frameStart.distanceToSquared(position.current) > .000001;
    if (nextStep) target.copy(position.current);
    if ((dx || dz) && distance > 0) target.copy(position.current);
    if (approaching && !dx && !dz && !route.current.length && arrivalSent.current !== approaching.requestId) {
      const destination = approachDestination(props);
      const withinReach = approaching.kind === 'witness' ? readyToInterview : closeEnoughToInspect;
      if (destination && withinReach(position.current, destination)) {
        arrivalSent.current = approaching.requestId; walking.current = false;
        if (approaching.kind === 'witness') face(Math.atan2(destination.x - position.current.x, destination.z - position.current.z));
        lastSent.current.copy(position.current); lastSentHeading.current = heading.current; wasMoving.current = false;
        onArrive(approaching, { x: position.current.x, z: position.current.z }, heading.current);
      } else onCancelApproach();
    }
    if (controls.current) { controls.current.target.lerp(position.current.clone().add(new Vector3(0, 1, -1)), 1 - Math.exp(-delta * 5)); controls.current.update(); camera.position.x = Math.max(-4.3, Math.min(4.3, camera.position.x)); }
    publish(walking.current);
  });
  const walk = (event: ThreeEvent<MouseEvent>) => { if (event.delta > 5 || talking || paused) return; event.stopPropagation(); wave.current = null; cancelledWave.current = serverNow(props); route.current = []; manualTarget.current = true; onCancelApproach(); target.set(event.point.x, 0, event.point.z); };
  return <ReducedMotion.Provider value={reducedMotion}>
    <color attach="background" args={[indoor ? '#363830' : outdoorFog.color]}/>
    <fogExp2 attach="fog" args={[indoor ? '#263733' : outdoorFog.color, indoor ? .012 : outdoorFog.density]}/>
    <ambientLight intensity={indoor ? .9 : .55} color={indoor ? '#c8dbe8' : '#bbc4b5'}/>
    <hemisphereLight args={[indoor ? '#91b4d0' : '#9faeac', '#4f483c', indoor ? 2.1 : 1.75]}/>
    <directionalLight position={[-8, 18, -10]} intensity={indoor ? 2.8 : 2} color={indoor ? '#b4cde3' : '#bcc9c6'} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-bias={-.0003}/>
    <OutdoorAtmosphere enabled={!indoor} square={false} reducedMotion={reducedMotion}>
    <mesh position={[0, indoor ? -.07 : 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={walk} material={indoor ? undefined : materials.cobble}><planeGeometry args={[indoor ? 12 : 30, indoor ? 30 : 70]}/>{(indoor) && <meshStandardMaterial color={indoor ? '#39372e' : '#535d50'} roughness={1}/>}</mesh>
    <SceneSet place={place}/>
    {props.cinematic ? <CinematicCast step={props.cinematic} player={player} partner={partner} npcs={npcs} speakingId={speakingId}/> : <>
    <group ref={self} position={initialPosition.current} rotation={initialRotation.current} name={`Investigator: ${player.name}`}><Person appearance={investigatorAppearances[player.role]} walking={walking} wave={wavePose} takingNotes={!!talking} speaking={speakingId === player.id}/>{!talking && <Html position={[0, characterLabelHeight(investigatorAppearances[player.role]), 0]} center zIndexRange={[2, 0]}><InvestigatorLabel player={player} current talkingTo={npcs.find(n => n.lease?.playerId === player.id)?.name}/></Html>}</group>
    {partner && partner.location === player.location && Date.now() - partner.lastSeen < 65000 && <RemotePlayer key={`${partner.id}-${partner.positionEpoch ?? 0}`} player={partner} speaking={speakingId === partner.id} talkingTo={partnerWitness?.name} interviewTarget={partnerInterviewTarget} serverTime={props.serverTime} receivedAt={props.receivedAt}/>}
    {npcs.map((npc, i) => <PacingWitness key={npc.id} npc={npc} index={i} indoor={indoor} layout={place.navigation} self={position} player={player} partner={partner} talking={talking} speaking={speakingId === npc.id} onTalk={onTalk} serverTime={props.serverTime} receivedAt={props.receivedAt}/>)}

    {place.hotspots.map((clue, i) => <SceneEvidence key={clue.id} clue={clue} index={i} place={place} found={found} objects={props.objects ?? {}} inspections={props.inspections ?? {}} onInspect={onInspect}/>)}
    </>}
    <OrbitControls ref={controls} makeDefault target={[0, 1, 7]} enablePan={false} enabled={!talking && !paused && !props.cinematic} minDistance={3.5} maxDistance={13} minPolarAngle={.55} maxPolarAngle={1.3} minAzimuthAngle={-.35} maxAzimuthAngle={.35} enableDamping={!reducedMotion} dampingFactor={.12}/>
    </OutdoorAtmosphere>
  </ReducedMotion.Provider>;
}
function CinematicCast({ step, player, partner, npcs, speakingId }: { step: CutsceneStep; player: Player; partner?: Player; npcs: NpcView[]; speakingId?: string | null }) {
  const story = useStory();
  const cast = step.actors ?? story.inspectors.map((inspector, index) => ({ id: inspector.id, position: [index ? 1.1 : -1.1, 0, 1] as const, heading: 0 }));
  return <>{cast.map(actor => {
    const inspector = [player, partner].find(person => person?.role === actor.id);
    const appearance = inspector ? story.inspectors.find(item => item.id === inspector.role)?.appearance : npcs.find(npc => npc.id === actor.id)?.appearance;
    if (!appearance) return null;
    return <group key={actor.id} position={[...actor.position]} rotation={[0, actor.heading ?? 0, 0]}><Person appearance={appearance} speaking={speakingId === actor.id}/></group>;
  })}</>;
}
function SceneEvidence({ clue, index, place, objects, found, inspections, onInspect }: { clue: GamePlace['hotspots'][number]; index: number; place: GamePlace; objects: Record<string, PhysicalObject>; found: string[]; inspections: ObjectInspections; onInspect: (id: string) => void }) {
  const object = objectForHotspot(clue.id, objects);
  const position = cluePoint(index, place.indoor, clue.id, place.navigation);
  return <group position={position} onClick={event => { event.stopPropagation(); if (event.delta <= 5) onInspect(clue.id); }}>
    {object ? <ObjectModel object={object} observed={observedObjectSteps(object, inspections, found)}/> : !place.props?.some(prop => prop.id === clue.id) && <mesh><boxGeometry args={[.6, .04, .8]}/><meshStandardMaterial color="#d6cbb3"/></mesh>}
    <Html position={[0, .7, 0]} center zIndexRange={[3, 0]}><button className={`clue-3d ${found.includes(clue.id) ? 'collected' : ''}`} aria-label={`Inspect ${clue.label}`} onClick={() => onInspect(clue.id)}><span>{found.includes(clue.id) ? <Check size={17}/> : <Plus size={19}/>}</span><strong>{clue.label}</strong></button></Html>
  </group>;
}
function InvestigatorLabel({ player, current = false, talkingTo }: { player: Player; current?: boolean; talkingTo?: string }) {
  return <div className={`avatar-label ${current ? 'self' : 'partner'}`}><strong>{player.name}{current && <Star size={12} fill="currentColor" aria-label="Your investigator"/>}{talkingTo && <MessageCircle size={13} className="conversation-icon" aria-label={`Speaking with ${talkingTo}`}/>}</strong></div>;
}
function RemotePlayer({ player, talkingTo, speaking, interviewTarget, serverTime, receivedAt }: { player: Player; talkingTo?: string; speaking: boolean; interviewTarget?: Point; serverTime?: number; receivedAt?: number }) {
  const appearance = useStory().inspectors.find(inspector => inspector.id === player.role)!.appearance;
  const root = useRef<Group>(null); const walking = useRef(false); const wavePose = useRef<number | null>(null);
  const initial = useRef<[number, number, number]>([player.position.x, 0, player.position.z]);
  const initialRotation = useRef<[number, number, number]>([0, player.motion?.heading ?? 0, 0]);
  const motion = useRef(new RemoteMovement(player.position, performance.now(), player.motion?.heading));
  useEffect(() => {
    motion.current.push(player.position, player.motion?.moving ?? true, player.motion?.heading ?? 0, performance.now());
  }, [player.motion?.at, player.motion?.heading, player.position.x, player.position.z]);
  useFrame((_, delta) => {
    if (!root.current) return;
    const next = motion.current.sample(performance.now());
    root.current.position.set(next.x, 0, next.z);
    wavePose.current = interviewTarget || player.activity === 'casebook' ? null : waveProgress(player.gesture, serverNow({ serverTime, receivedAt }));
    const heading = interviewTarget ? Math.atan2(interviewTarget.x - next.x, interviewTarget.z - next.z) : wavePose.current !== null ? player.gesture!.heading : next.heading;
    const angle = Math.atan2(Math.sin(heading - root.current.rotation.y), Math.cos(heading - root.current.rotation.y));
    root.current.rotation.y += angle * (1 - Math.exp(-Math.min(delta, .1) * 14));
    walking.current = wavePose.current === null && next.moving && player.activity !== 'casebook' && !interviewTarget;
  });
  // A stable initial prop leaves all subsequent transforms to the frame loop.
  return <group ref={root} position={initial.current} rotation={initialRotation.current} name={`Investigator: ${player.name}`}><Person appearance={appearance} walking={walking} wave={wavePose} reading={player.activity === 'casebook'} takingNotes={!!interviewTarget} speaking={speaking}/><Html position={[0, characterLabelHeight(appearance), 0]} center zIndexRange={[2, 0]}><InvestigatorLabel player={player} talkingTo={talkingTo}/></Html></group>;
}
function PacingWitness({ npc, index, indoor, layout, self, player, partner, talking, speaking, onTalk, serverTime, receivedAt }: { npc: NpcView; index: number; indoor: boolean; layout?: SceneLayout; self: { current: Vector3 }; player: Player; partner?: Player; talking: string | null; speaking: boolean; onTalk: (npc: NpcView) => void; serverTime?: number; receivedAt?: number }) {
  const root = useRef<Group>(null), walking = useRef(false), reducedMotion = useContext(ReducedMotion);
  const home = useMemo(() => witnessPosition(npc.id, layout), [npc.id, layout]);
  const story = useStory();
  const appearance = npc.appearance ?? story.inspectors[0].appearance;
  const pose = witnessPose(npc.posture, appearance.height);
  const initial = useRef<XYZ>([home.x, 0, home.z]);
  useFrame((_, frameDelta) => {
    if (!root.current) return;
    const delta = Math.min(frameDelta, .1), now = serverNow({ serverTime, receivedAt });
    const nearby = [self.current, ...(partner?.location === npc.location && Date.now() - partner.lastSeen < 65000 ? [partner.position] : [])].sort((a, b) => Math.hypot(a.x - home.x, a.z - home.z) - Math.hypot(b.x - home.x, b.z - home.z));
    const interviewing = talking === npc.id || !!(npc.lease && npc.lease.until > now);
    // Keep attention on the person conducting this interview on both clients.
    // A nearer observer behind the witness must not turn their face away.
    const listener = talking === npc.id || (interviewing && npc.lease?.playerId === player.id) ? self.current
      : interviewing && npc.lease?.playerId === partner?.id && partner?.location === npc.location ? partner.position : nearby[0];
    const attentive = pose.seated || reducedMotion || interviewing || Math.hypot(listener.x - home.x, listener.z - home.z) < WITNESS_ATTENTION_DISTANCE;
    const patrol = witnessPatrol(npc.id, index, indoor, now, layout, npc.posture), target = attentive ? home : patrol;
    const dx = target.x - root.current.position.x, dz = target.z - root.current.position.z, distance = Math.hypot(dx, dz);
    const step = Math.min(distance, delta * WITNESS_RETURN_SPEED);
    if (distance > .001) { root.current.position.x += dx / distance * step; root.current.position.z += dz / distance * step; }
    walking.current = step > delta * .07 && !reducedMotion;
    const heading = pose.seated ? 0 : attentive && distance < .08 ? Math.atan2(listener.x - home.x, listener.z - home.z) : distance > .01 ? Math.atan2(dx, dz) : patrol.heading;
    const turn = Math.atan2(Math.sin(heading - root.current.rotation.y), Math.cos(heading - root.current.rotation.y));
    root.current.rotation.y += turn * (1 - Math.exp(-delta * 7));
  });
  return <group ref={root} position={initial.current} name={`Witness: ${npc.name}`} onClick={e => { e.stopPropagation(); if (e.delta <= 5) onTalk(npc); }}>
    <Person appearance={appearance} walking={walking} speaking={speaking} posture={npc.posture} hatPlacement={npc.hatPlacement} pace/>
    {talking !== npc.id && <Html position={[0, characterLabelHeight(appearance, npc.posture, npc.hatPlacement), 0]} center zIndexRange={[3, 0]}><button className="npc-label" disabled={!!npc.lease && npc.lease.playerId !== player.id} onClick={() => onTalk(npc)}><strong>{npc.name}</strong><span>{npc.lease && npc.lease.playerId !== player.id ? 'Speaking with your partner' : readyToInterview(player.position, home) ? 'Speak' : 'Walk over'}</span></button></Html>}
  </group>;
}
type XYZ = [number, number, number];
function Eyes() {
  const eyes = useRef<Group>(null), reducedMotion = useContext(ReducedMotion);
  const blink = useRef({ next: -1, started: -1 });
  useFrame(({ clock }) => {
    if (!eyes.current) return;
    const t = clock.elapsedTime;
    if (blink.current.next < 0) blink.current.next = t + 1.5 + Math.random() * 3.5;
    if (t >= blink.current.next) { blink.current.started = t; blink.current.next = t + 2.8 + Math.random() * 3.2; }
    const progress = (t - blink.current.started) / .18;
    eyes.current.scale.y = !reducedMotion && progress >= 0 && progress < 1 ? Math.max(.08, 1 - Math.sin(progress * Math.PI)) : 1;
  });
  return <group ref={eyes} position={[0, .266, .222]}>{[-1, 1].map(side => <mesh key={side} position={[side * .088, 0, 0]}><sphereGeometry args={[.024, 8, 6]}/><meshStandardMaterial color="#252b29"/></mesh>)}</group>;
}
export function Person({ appearance, walking, wave, reading = false, takingNotes = false, pace = false, speaking = false, posture, hatPlacement = 'head' }: { appearance: CharacterAppearance; walking?: { current: boolean }; wave?: { current: number | null }; reading?: boolean; takingNotes?: boolean; pace?: boolean; speaking?: boolean; posture?: WitnessPosture; hatPlacement?: HatPlacement }) {
  const { coat, hair, skin, build, height } = appearance;
  const pose = witnessPose(posture, height);
  const reducedMotion = useContext(ReducedMotion);
  const legs = useRef<Group>(null); const torso = useRef<Group>(null); const head = useRef<Group>(null); const arms = useRef<Group>(null);
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime, moving = walking?.current && !reading && !takingNotes && !pose.seated;
    if (legs.current) for (const [i, leg] of legs.current.children.entries()) {
      const target = moving ? Math.sin(t * (pace ? 4.5 : 8)) * (pace ? .27 : .45) * (i === 0 ? 1 : -1) : 0;
      leg.rotation.x += (target - leg.rotation.x) * (1 - Math.exp(-Math.min(delta, .1) * 20));
    }
    if (arms.current) for (const [i, arm] of arms.current.children.entries()) {
      const waving = i === 0 && !reading && !takingNotes ? waveArmPose(wave?.current ?? null, reducedMotion) : { x: 0, z: 0 };
      const target = moving ? Math.sin(t * (pace ? 4.5 : 8)) * (pace ? .14 : .23) * (i === 0 ? -1 : 1) : waving.x;
      const blend = 1 - Math.exp(-Math.min(delta, .1) * 12);
      arm.rotation.x += (target - arm.rotation.x) * blend;
      arm.rotation.z += (waving.z - arm.rotation.z) * blend;
    }
    if (torso.current) torso.current.position.y = pose.bodyOffset + (reducedMotion ? 0 : Math.sin(t * (moving ? 16 : 1.6)) * (moving ? .025 : .007));
    if (head.current) head.current.rotation.x = reading ? .28 + (reducedMotion ? 0 : Math.sin(t * 1.2) * .035) : takingNotes && !speaking ? .16 : 0;
  });
  return <group scale={[build, height, 1]}>
    {pose.seated ? <SeatedLegs hipHeight={pose.hipHeight} shoeHeight={pose.shoeHeight}/> : <group ref={legs} position={[0, .85, 0]}>{[-1, 1].map(side => <group position={[side * .15, 0, 0]} key={side}><mesh position={[0, -.36, 0]} castShadow><boxGeometry args={[.22, .75, .25]}/><meshStandardMaterial color="#24292a" roughness={1}/></mesh><mesh position={[0, -.76, .09]} castShadow><boxGeometry args={[.25, .16, .4]}/><meshStandardMaterial color="#172023" roughness={.68}/></mesh></group>)}</group>}
    <group ref={torso} position={[0, pose.bodyOffset, 0]}>
      <PeriodCostume appearance={appearance} seated={pose.seated}/>
      <group ref={head} position={[0, 1.76, .03]} scale={appearance.face}>
        <mesh position={[0, .23, 0]} castShadow><sphereGeometry args={[.24, 16, 12]}/><meshStandardMaterial color={skin} roughness={.97}/></mesh>
        <PeriodHair appearance={appearance}/>
        {[-1, 1].map(side => <group key={side}><mesh position={[side * .225, .21, 0]} scale={[.55, 1, .7]}><sphereGeometry args={[.066, 8, 6]}/><meshStandardMaterial color={skin}/></mesh><mesh position={[side * .088, .314, .218]} rotation={[0, 0, side * .07]}><boxGeometry args={[.087, .023, .028]}/><meshStandardMaterial color={hair}/></mesh></group>)}
        <Eyes/>
        <mesh position={[0, .213, .247]} scale={[.7, 1, 1]}><sphereGeometry args={[.052, 9, 7]}/><meshStandardMaterial color={skin}/></mesh>
        <Mouth speaking={speaking && !reading} beard={appearance.beard}/>
        <FacialHair appearance={appearance}/>{hatPlacement !== 'lap' && <Headwear appearance={appearance}/>}
      </group>
      {takingNotes && !reading ? <InterviewNotes appearance={appearance} reducedMotion={reducedMotion} speaking={speaking}/> : <group ref={arms}>{[-1, 1].map(side => <group key={side} position={[side * .35, 1.58, 0]}>
        {pose.seated ? <>
          <mesh position={[0, -.19, .03]} rotation={[-.15, 0, side * .08]} castShadow><cylinderGeometry args={[.1, .095, .4, 7]}/><meshStandardMaterial color={coat}/></mesh>
          <mesh position={[-side * .02, -.45, .22]} rotation={[-1.07, 0, -side * .15]} castShadow><cylinderGeometry args={[.095, .078, .4, 7]}/><meshStandardMaterial color={coat}/></mesh>
          <mesh position={[-side * .05, -.55, .4]}><sphereGeometry args={[.09, 8, 6]}/><meshStandardMaterial color={skin}/></mesh>
        </> : <>
          <mesh position={[0, -.35, reading ? .17 : .02]} rotation={[reading ? -.8 : 0, 0, side * .13]} castShadow><cylinderGeometry args={[.1, .095, .75, 7]}/><meshStandardMaterial color={coat}/></mesh>
          <mesh position={[side * .045, reading ? -.59 : -.76, reading ? .43 : .025]}><sphereGeometry args={[.09, 8, 6]}/><meshStandardMaterial color={skin}/></mesh>
        </>}
      </group>)}</group>}
      {pose.seated && hatPlacement === 'lap' && <group position={[0, 1.12, .38]} rotation={[-.12, 0, 0]}><group position={[0, -.43, 0]}><Headwear appearance={appearance}/></group></group>}
      {reading && <ReadingBook/>}
    </group>
  </group>;
}
function SeatedLegs({ hipHeight, shoeHeight }: { hipHeight: number; shoeHeight: number }) {
  return <group>{[-1, 1].map(side => <group key={side} position={[side * .17, 0, 0]}>
    <mesh position={[0, hipHeight, .22]} castShadow><boxGeometry args={[.23, .22, .55]}/><meshStandardMaterial color="#24292a" roughness={1}/></mesh>
    <mesh position={[0, hipHeight / 2, .45]} castShadow><boxGeometry args={[.21, hipHeight - .05, .23]}/><meshStandardMaterial color="#24292a" roughness={1}/></mesh>
    <mesh position={[0, shoeHeight, .53]} castShadow><boxGeometry args={[.25, .16, .39]}/><meshStandardMaterial color="#172023" roughness={.68}/></mesh>
  </group>)}</group>;
}
function Mouth({ speaking, beard }: { speaking: boolean; beard: CharacterAppearance['beard'] }) {
  const mouth = useRef<Mesh>(null), opening = useRef(0), reducedMotion = useContext(ReducedMotion);
  useFrame(({ clock }, delta) => {
    if (!mouth.current) return;
    const t = clock.elapsedTime;
    const target = speaking && !reducedMotion ? (1 - Math.cos(t * 25)) * .5 * (.75 + .25 * Math.sin(t * 9)) : 0;
    opening.current = reducedMotion ? 0 : opening.current + (target - opening.current) * (1 - Math.exp(-Math.min(delta, .1) * 28));
    mouth.current.scale.set(.043 * (1 - opening.current * .12), .006 + opening.current * .033, .012);
    mouth.current.position.y = .137 - opening.current * .014;
  });
  return <mesh ref={mouth} name="Mouth" position={[0, .137, beard === 'full' ? .26 : .233]} scale={[.043, .006, .012]}>
    <sphereGeometry args={[1, 12, 8]}/><meshStandardMaterial color="#493029" roughness={1}/>
  </mesh>;
}
function FacialHair({ appearance: { beard, hair } }: { appearance: CharacterAppearance }) {
  if (beard === 'none') return null;
  return <group>
    {beard === 'full' && <mesh position={[0, .075, .075]} scale={[1, .95, .85]}><sphereGeometry args={[.207, 12, 8]}/><meshStandardMaterial color={hair} roughness={1}/></mesh>}
    {beard === 'handlebar' && [-1, 1].map(side => <mesh key={side} position={[side * .18, .195, .23]} rotation={[0, 0, side * -.3]}><torusGeometry args={[.06, .022, 8, 14, Math.PI * 1.2]}/><meshStandardMaterial color={hair}/></mesh>)}
    {beard === 'sideburns' && [-1, 1].map(side => <mesh key={side} position={[side * .165, .14, .085]} scale={[.62, 1.25, .85]}><sphereGeometry args={[.105, 10, 7]}/><meshStandardMaterial color={hair}/></mesh>)}
    {beard !== 'sideburns' && [-1, 1].map(side => <group key={side}><mesh position={[side * .067, .171, .227]} rotation={[0, 0, side * -.16]} scale={[1, .36, .52]}><sphereGeometry args={[beard === 'handlebar' ? .155 : beard === 'drooping' ? .114 : .086, 10, 7]}/><meshStandardMaterial color={hair}/></mesh>{beard === 'drooping' && <mesh position={[side * .135, .106, .204]} rotation={[0, 0, side * -.2]} scale={[.37, 1, .44]}><sphereGeometry args={[.087, 10, 7]}/><meshStandardMaterial color={hair}/></mesh>}</group>)}
  </group>;
}
function Headwear({ appearance: { hat, accent } }: { appearance: CharacterAppearance }) {
  if (hat === 'none') return null;
  if (hat === 'bonnet') return <group position={[0, .39, -.06]}><mesh scale={[1.12, .65, 1.12]}><sphereGeometry args={[.29, 12, 8]}/><meshStandardMaterial color={accent}/></mesh><mesh position={[0, -.05, .17]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.26, .04, 6, 16, Math.PI]}/><meshStandardMaterial color={accent}/></mesh>{[-1, 1].map(s => <mesh key={s} position={[s * .2, -.25, .06]} rotation={[0, 0, s * -.27]}><boxGeometry args={[.055, .32, .035]}/><meshStandardMaterial color={accent}/></mesh>)}</group>;
  if (hat === 'cap') return <group position={[0, .43, 0]}><mesh scale={[1.18, .43, 1.04]}><sphereGeometry args={[.28, 12, 8]}/><meshStandardMaterial color="#565549"/></mesh><mesh position={[0, -.035, .21]} scale={[1, .15, .7]}><sphereGeometry args={[.23, 12, 8]}/><meshStandardMaterial color="#494c41"/></mesh></group>;
  return <group position={[0, .43, -.02]}>
    <mesh castShadow><cylinderGeometry args={[hat === 'top' ? .34 : .31, hat === 'top' ? .34 : .31, .045, 16]}/><meshStandardMaterial color="#242526"/></mesh>
    {hat === 'bowler' ? <mesh position={[0, .02, 0]}><sphereGeometry args={[.265, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2]}/><meshStandardMaterial color="#292a2b"/></mesh> : <mesh position={[0, hat === 'helmet' ? 0 : .22, 0]} scale={[1, hat === 'helmet' ? 1.7 : 1, 1]} castShadow>{hat === 'helmet' ? <sphereGeometry args={[.265, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]}/> : <cylinderGeometry args={[.23, .265, .44, 16]}/>}<meshStandardMaterial color={hat === 'helmet' ? '#202c3c' : '#323237'}/></mesh>}
    {hat === 'helmet' ? <mesh position={[0, .15, .257]}><sphereGeometry args={[.067, 6, 4]}/><meshStandardMaterial color="#b7bbc0" metalness={.6} roughness={.5}/></mesh> : <mesh position={[0, .06, 0]}><cylinderGeometry args={[.263, .271, .045, 32]}/><meshStandardMaterial color="#37312e"/></mesh>}
  </group>;
}
function ReadingBook() {
  const page = useRef<Group>(null); const reducedMotion = useContext(ReducedMotion);
  useFrame(({ clock }) => {
    if (!page.current) return;
    const phase = clock.elapsedTime % 6;
    page.current.visible = !reducedMotion && phase < 1.4;
    page.current.rotation.z = Math.PI * Math.min(1, phase / 1.4);
  });
  return <group position={[0, 1.12, .49]} rotation={[.22, 0, 0]}>
    {[-1, 1].map(side => <group key={side} rotation={[0, 0, side * .12]}>
      <mesh position={[side * .2, 0, 0]} castShadow><boxGeometry args={[.4, .05, .49]}/><meshStandardMaterial color="#354e49" roughness={.8}/></mesh>
      <mesh position={[side * .19, .045, 0]}><boxGeometry args={[.35, .055, .44]}/><meshStandardMaterial color="#e4d8bb"/></mesh>

    </group>)}
    <mesh position={[.1, .03, .26]}><boxGeometry args={[.035, .008, .15]}/><meshStandardMaterial color="#995449"/></mesh>
    <group ref={page} position={[0, .08, 0]}><mesh position={[.175, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[.33, .43]}/><meshStandardMaterial color="#e4d8bb"/></mesh></group>
  </group>;
}
