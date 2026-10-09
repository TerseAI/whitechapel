import { Canvas } from '@react-three/fiber';
import { Person } from './World3D';
import { useStory } from './story/StoryProvider';
import type { InvestigatorId } from '../../shared/game/investigators';

export function InspectorPortrait({ inspector }: { inspector: InvestigatorId }) {
  const appearance = useStory().inspectors.find(item => item.id === inspector)!.appearance;
  return <div className="inspector-portrait" aria-hidden="true"><Canvas style={{ position: 'absolute', inset: 0 }} camera={{ position: [0, .25, 5.8], fov: 35 }} dpr={[1, 1.5]} fallback={<span/>}>
    <ambientLight intensity={1.8}/><directionalLight position={[2, 5, 5]} intensity={3}/>
    <group position={[0, -1.35, 0]} rotation={[0, -.16, 0]}><Person appearance={{ ...appearance, face: [appearance.face[0] / appearance.build, appearance.face[1] / appearance.height, appearance.face[2]] }}/></group>
  </Canvas></div>;
}
