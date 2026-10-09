import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { prepareImportedScene } from './imported-scene';

export function ImportedModel({ src }: { src: string }) {
  const gltf = useGLTF(src);
  const scene = useMemo(() => prepareImportedScene(gltf.scene), [gltf.scene]);
  return <primitive object={scene}/>;
}
