import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { DoubleSide, SRGBColorSpace } from 'three';
import type { Artwork } from './DocumentReader';

type Props = { artwork: Artwork; width?: number; onClick?: (event: ThreeEvent<MouseEvent>) => void };

export function PaperProp({ artwork, width = .6, onClick }: Props) {
  const source = useTexture(artwork.src);
  const texture = useMemo(() => {
    const copy = source.clone();
    copy.colorSpace = SRGBColorSpace;
    copy.offset.set(.02, .02);
    copy.repeat.set(.96, .96);
    copy.anisotropy = 4;
    copy.needsUpdate = true;
    return copy;
  }, [source]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh name={artwork.description} onClick={onClick} receiveShadow>
    <planeGeometry args={[width, width * artwork.height / artwork.width]}/>
    <meshStandardMaterial map={texture} roughness={.98} side={DoubleSide}/>
  </mesh>;
}
