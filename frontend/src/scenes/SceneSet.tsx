import { ImportedModel } from './ImportedModel';
import type { GamePlace } from '../../../shared/game/types';
import { useStory, storyAsset, storyImage } from '../story/StoryProvider';
import { PaperProp } from '../documents/PaperProp';
import { ModelVisual } from '../objects/ObjectModel';

export function SceneSet({ place }: { place: GamePlace }) {
  const story = useStory();
  const backdrop = storyImage(story, place.backdrop);
  return <>
    {place.scene === 'model' && place.sceneAsset ? <ImportedModel src={storyAsset(story, story.models[place.sceneAsset])}/> : (place.scene === 'basic-room' || (!place.scene && place.indoor)) ? <EmptyRoom/> : <EmptyYard/>}
    {backdrop && <group position={[0, 3, -8.9]}><PaperProp artwork={backdrop} width={8}/></group>}
    {place.props?.map(prop => <group key={prop.id} position={prop.position} rotation={prop.rotation} scale={prop.scale}><ModelVisual model={prop.model} asset={prop.asset} color={prop.color}/></group>)}
  </>;
}

function EmptyRoom() {
  return <group>{[[0, 2.5, -9, 10, 5, .2], [-5, 2.5, 1, .2, 5, 20], [5, 2.5, 1, .2, 5, 20]].map(([x, y, z, w, h, d], index) => <mesh key={index} position={[x, y, z]} receiveShadow><boxGeometry args={[w, h, d]}/><meshStandardMaterial color="#48504a" roughness={1}/></mesh>)}</group>;
}

function EmptyYard() {
  return <mesh position={[0, .4, -14]} receiveShadow><boxGeometry args={[12, .8, .4]}/><meshStandardMaterial color="#50574e" roughness={1}/></mesh>;
}
