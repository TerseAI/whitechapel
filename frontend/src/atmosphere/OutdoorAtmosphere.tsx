import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Cloud, Clouds, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Group, MeshBasicMaterial } from 'three';

export const outdoorFog = { color: '#718077', density: .062 };
const Motion = createContext(false);
const noRaycast = () => {};

export function OutdoorAtmosphere({ enabled, square, reducedMotion, children }: { enabled: boolean; square: boolean; reducedMotion: boolean; children: ReactNode }) {
  return enabled ? <Motion.Provider value={reducedMotion}>
    <SmokeVolume square={square}>{children}</SmokeVolume>
  </Motion.Provider> : <>{children}</>;
}

function SmokeVolume({ square, children }: { square: boolean; children: ReactNode }) {
  const clouds = useRef<Group>(null);
  const reducedMotion = useContext(Motion);
  useLayoutEffect(() => {
    // The shared particle mesh must never catch ground or witness clicks.
    clouds.current?.children.filter(child => 'isInstancedMesh' in child).forEach(child => { child.raycast = noRaycast; });
  }, []);
  return <Clouds ref={clouds} name="Outdoor atmosphere" texture="/materials/street-smoke.svg" material={MeshBasicMaterial} limit={96} frustumCulled={false}>
    {[-9, -3, 3, 8].map((z, index) => <Drift key={z} seed={index + 1} position={[index % 2 ? -1 : 1, .9, z]}>
      <Cloud seed={index + 31} segments={8} bounds={[square ? 5 : 2.4, .35, 3]} scale={[1.7, .6, 1]} volume={2.5} growth={.3} opacity={.32} color="#aab4a8" speed={reducedMotion ? 0 : .07} fade={4}/>
    </Drift>)}
    <Drift seed={7} position={[0, 3.4, -8]}>
      <Cloud seed={71} segments={8} bounds={[square ? 7 : 4, 1.3, 3]} volume={3.5} growth={.4} opacity={.28} color="#929e91" speed={reducedMotion ? 0 : .045} fade={5}/>
    </Drift>
    {[-3.5, 3.5].map((x, index) => <Drift key={x} seed={index + 11} position={[x, 2.3, -3]}>
      <Cloud seed={index + 81} segments={8} bounds={[.8, 1.2, 5]} volume={2} growth={.3} opacity={.13} color="#a3ad9f" speed={reducedMotion ? 0 : .04} fade={4}/>
    </Drift>)}
    {children}
  </Clouds>;
}

export function ChimneySmoke({ position, seed }: { position: [number, number, number]; seed: number }) {
  const reducedMotion = useContext(Motion);
  return <Drift position={position} seed={seed} rising>
    <Cloud seed={seed} position={[.55, 1.15, 0]} segments={4} bounds={[.35, 1.15, .2]} volume={.9} smallestVolume={.3} growth={.5} opacity={.42} color="#697069" speed={reducedMotion ? 0 : .13} fade={4} concentrate="outside"/>
  </Drift>;
}

function Drift({ position, seed, rising = false, children }: { position: [number, number, number]; seed: number; rising?: boolean; children: ReactNode }) {
  const group = useRef<Group>(null);
  const reducedMotion = useContext(Motion);
  const time = useRef(seed * 1.7);
  useFrame((_, delta) => {
    if (!group.current || reducedMotion) return;
    time.current += Math.min(delta, .05);
    group.current.position.x = position[0] + Math.sin(time.current * .12) * (rising ? .25 : .8);
    group.current.position.y = position[1] + Math.sin(time.current * .18) * (rising ? .16 : .06);
    group.current.position.z = position[2] + Math.cos(time.current * .09) * (rising ? .15 : .6);
  });
  return <group ref={group} position={position}>{children}</group>;
}

export function GaslampHalo() {
  const map = useTexture('/materials/gaslamp-halo.svg');
  return <sprite name="Gaslamp halo" scale={[3.6, 3.6, 1]} raycast={noRaycast}>
    <spriteMaterial map={map} color="#ffc478" opacity={.5} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false}/>
  </sprite>;
}
