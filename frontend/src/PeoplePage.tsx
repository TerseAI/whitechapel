import { UserRound } from 'lucide-react';
import type { NpcView } from '../../shared/game/types';
import { useStory, storyImage } from './story/StoryProvider';

export function PeoplePage({ people }: { people: NpcView[] }) {
  const story = useStory();
  return <div className="people-page">
    <div className="page-heading"><div><h1>People</h1><p>The witnesses and characters in your enquiry.</p></div></div>
    {people.length ? <h2>People to question</h2> : <p>No witnesses have been introduced.</p>}
    <div className="people-list">{people.map(person => {
      const portrait = storyImage(story, person.portrait);
      return <article className="person-row" key={person.id}>
        {portrait ? <img className="person-mugshot" src={portrait.src} alt={`Portrait of ${person.name}`} width={portrait.width} height={portrait.height}/> : <UserRound size={42} aria-hidden="true"/>}
        <div><h3>{person.name}</h3><p>{person.occupation}</p></div>
      </article>;
    })}</div>
  </div>;
}
