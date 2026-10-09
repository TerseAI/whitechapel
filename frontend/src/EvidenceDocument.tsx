import type { Evidence, EvidenceStatement } from '../../shared/game/types';
import { StoryDocumentReader } from './documents/StoryDocumentReader';
import { useStory, storyImage } from './story/StoryProvider';
import './evidence.css';

type Props = { evidence: Evidence; onClose: () => void; onCaseMap?: () => void };
export function EvidenceDocument({ evidence, onClose, onCaseMap }: Props) {
  const story = useStory();
  const image = storyImage(story, evidence.image);
  if (evidence.document) return <div className="evidence-document"><StoryDocumentReader document={evidence.document} onClose={onClose} action={onCaseMap ? { label: 'Open the case map', onSelect: onCaseMap } : undefined}/><RecordedStatements statements={evidence.statements}/></div>;
  return <article className="document-transcription">
    <h2>{evidence.title}</h2>
    {image && <img src={image.src} width={image.width} height={image.height} alt={image.description} style={{ maxWidth: '100%', height: 'auto' }}/>}
    <p>{evidence.description}</p>
    {evidence.statements?.length ? <RecordedStatements statements={evidence.statements}/> : <p>{evidence.detail}</p>}
    <p>{evidence.provenance}</p>
    <button className="primary" onClick={onClose}>Close</button>
    {onCaseMap && <button className="text-button" onClick={onCaseMap}>Open the case map</button>}
  </article>;
}

function RecordedStatements({ statements }: { statements?: EvidenceStatement[] }) {
  if (!statements?.length) return null;
  return <section className="recorded-statements" aria-label="Recorded interview exchanges">{statements.map(statement => <section key={statement.id}>
    <h3>{statement.witnessName} · Recorded exchange</h3>
    <dl>
      {statement.question && <div><dt>{statement.investigatorName}</dt><dd>{statement.question}</dd></div>}
      {statement.turns.map((turn, index) => <div key={index}><dt>{turn.speaker === 'witness' ? statement.witnessName : statement.investigatorName}</dt><dd>{turn.text}</dd></div>)}
    </dl>
  </section>)}</section>;
}
