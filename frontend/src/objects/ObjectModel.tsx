import type { PhysicalObject } from '../../../shared/game/physical-objects';
import { useStory, storyAsset, storyImage } from '../story/StoryProvider';
import { PaperProp } from '../documents/PaperProp';
import { ImportedModel } from '../scenes/ImportedModel';

export function ObjectModel({ object }: { object: PhysicalObject; observed?: string[]; onInspect?: (id: string) => void }) {
  return <ModelVisual model={object.model} asset={object.asset} color={object.color}/>;
}
export function ModelVisual({ model, asset, color = '#b4a487' }: { model: string; asset?: string; color?: string }) {
  const story = useStory();
  const image = storyImage(story, asset);
  if (model === 'image' && image) return <PaperProp artwork={image} width={1}/>;
  if (model === 'gltf' && asset) return <ImportedModel src={storyAsset(story, story.models[asset])}/>;
  return <mesh castShadow receiveShadow>
    {model === 'sphere' ? <sphereGeometry args={[.45, 20, 16]}/> : model === 'cylinder' ? <cylinderGeometry args={[.35, .35, .7, 20]}/> : <boxGeometry args={[.9, .5, .7]}/>}
    <meshStandardMaterial color={color} roughness={.7}/>
  </mesh>;
}
