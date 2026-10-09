import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Euler, Group, Mesh, Quaternion, Vector3 } from 'three';
import type { CharacterAppearance } from '../game/character-appearance';
import { interviewNotesMotion } from './interview-notes-motion';

const bookPosition = new Vector3(-.1, 1.2, .48);
const bookRotation = new Euler(.18, 0, -.06);
const bookQuaternion = new Quaternion().setFromEuler(bookRotation);
const leftElbow = new Vector3(-.425, 1.19, .17);
const rightElbow = new Vector3(.37, 1.215, .14);
const wristFromTip = new Vector3(.1, .037, -.082);
const up = new Vector3(0, 1, 0);

export function InterviewNotes({ appearance, reducedMotion, speaking }: {
  appearance: CharacterAppearance;
  reducedMotion: boolean;
  speaking: boolean;
}) {
  const writingHand = useRef<Group>(null);
  const forearm = useRef<Mesh>(null);
  const motion = useMemo(() => {
    const tip = new Vector3(...interviewNotesMotion(0, speaking, reducedMotion).tip);
    return { tip, target: new Vector3(), hand: new Vector3(), wrist: new Vector3(), direction: new Vector3() };
  }, []);
  const initialWrist = bookPoint(motion.tip.clone().add(wristFromTip));
  useFrame(({ clock }, delta) => {
    motion.target.set(...interviewNotesMotion(clock.elapsedTime, speaking, reducedMotion).tip);
    if (reducedMotion) motion.tip.copy(motion.target);
    else motion.tip.lerp(motion.target, 1 - Math.exp(-Math.min(delta, .1) * 18));
    motion.hand.copy(motion.tip).applyEuler(bookRotation).add(bookPosition);
    writingHand.current?.position.copy(motion.hand);
    motion.wrist.copy(motion.tip).add(wristFromTip).applyEuler(bookRotation).add(bookPosition);
    if (forearm.current) placeSleeve(forearm.current, rightElbow, motion.wrist, motion.direction);
  });
  return <group name="Detective interview notes">
    <Sleeve from={new Vector3(-.35, 1.58, 0)} to={leftElbow} color={appearance.coat}/>
    <Sleeve from={leftElbow} to={bookPoint(new Vector3(-.14, -.037, -.035))} color={appearance.coat} lower/>
    <Sleeve from={new Vector3(.35, 1.58, 0)} to={rightElbow} color={appearance.coat}/>
    <Sleeve from={rightElbow} to={initialWrist} color={appearance.coat} lower segmentRef={forearm}/>
    <group position={bookPosition} quaternion={bookQuaternion}>
      <Notebook/>
      <mesh position={[-.127, -.023, .015]} scale={[.75, .56, 1]} castShadow><sphereGeometry args={[.074, 10, 8]}/><meshStandardMaterial color={appearance.skin} roughness={.95}/></mesh>
      <mesh position={[-.105, .033, .027]} rotation={[0, .3, -.25]} castShadow><capsuleGeometry args={[.016, .055, 3, 7]}/><meshStandardMaterial color={appearance.skin} roughness={.95}/></mesh>
    </group>
    <group ref={writingHand} position={bookPoint(motion.tip.clone())} quaternion={bookQuaternion} name="Writing hand">
      <mesh position={[.068, .077, -.046]} rotation={[.2, 0, -.58]} scale={[.66, 1, .63]} castShadow><sphereGeometry args={[.067, 10, 8]}/><meshStandardMaterial color={appearance.skin} roughness={.95}/></mesh>
      {[0, 1].map(index => <mesh key={index} position={[.049 + index * .014, .064, -.018 - index * .009]} rotation={[.45, .2, -.75]} castShadow><capsuleGeometry args={[.013, .031, 3, 7]}/><meshStandardMaterial color={appearance.skin} roughness={.95}/></mesh>)}
      <Pencil/>
    </group>
  </group>;
}

function Sleeve({ from, to, color, lower = false, segmentRef }: {
  from: Vector3; to: Vector3; color: string; lower?: boolean; segmentRef?: RefObject<Mesh | null>;
}) {
  const position = from.clone().add(to).multiplyScalar(.5);
  const quaternion = new Quaternion().setFromUnitVectors(up, to.clone().sub(from).normalize());
  return <mesh ref={segmentRef} position={position} quaternion={quaternion} scale={[1, from.distanceTo(to), 1]} castShadow>
    <cylinderGeometry args={[lower ? .072 : .09, .095, 1, 9]}/><meshStandardMaterial color={color} roughness={1}/>
  </mesh>;
}

function Notebook() {
  return <group name="Pocket notebook">
    <mesh castShadow><boxGeometry args={[.255, .014, .305]}/><meshStandardMaterial color="#394037" roughness={.94}/></mesh>
    <mesh position={[0, .019, 0]} castShadow><boxGeometry args={[.228, .021, .282]}/><meshStandardMaterial color="#ded7c2" roughness={1}/></mesh>
    <mesh position={[-.123, .009, 0]} castShadow><boxGeometry args={[.016, .032, .307]}/><meshStandardMaterial color="#453b31" roughness={.92}/></mesh>
    {[.014, .02, .026].map(y => <mesh key={y} position={[0, y, .142]}><boxGeometry args={[.225, .001, .001]}/><meshStandardMaterial color="#b7ad96" roughness={1}/></mesh>)}
  </group>;
}

function Pencil() {
  const quaternion = useMemo(() => new Quaternion().setFromUnitVectors(up, new Vector3(.58, .72, -.38).normalize()), []);
  return <group quaternion={quaternion} name="Wooden pencil">
    <mesh position={[0, .004, 0]}><cylinderGeometry args={[.002, 0, .008, 6]}/><meshStandardMaterial color="#31332f" roughness={1}/></mesh>
    <mesh position={[0, .015, 0]}><cylinderGeometry args={[.006, .002, .014, 6]}/><meshStandardMaterial color="#c3a273" roughness={.94}/></mesh>
    <mesh position={[0, .0845, 0]} castShadow><cylinderGeometry args={[.006, .006, .125, 6]}/><meshStandardMaterial color="#866844" roughness={.88}/></mesh>
  </group>;
}

function bookPoint(point: Vector3) { return point.applyEuler(bookRotation).add(bookPosition); }

function placeSleeve(mesh: Mesh, from: Vector3, to: Vector3, direction: Vector3) {
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  direction.copy(to).sub(from);
  mesh.scale.y = direction.length();
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
}
