import { Check, Mail, ShieldCheck } from 'lucide-react';
import { ScenePanel } from '../ScenePanel';
import type { ChapterCompletion } from './case-progress';
import './case-map.css';

export function ChapterTransition({ completion, nextChapter, briefing, onContinue }: { completion: ChapterCompletion; nextChapter: number; briefing: boolean; onContinue: () => void }) {
  return <ScenePanel className="chapter-transition" label={completion.final ? 'Case complete' : `Chapter ${completion.chapter} complete`} onClose={onContinue}>
    <div className="chapter-completed">
      <div className="chapter-seal"><ShieldCheck size={36}/></div>
      <p className="chapter-complete-label"><Check size={16}/>{completion.final ? 'Case complete' : `Chapter ${completion.chapter} complete`}</p>
      <h1>{completion.final ? 'The evidence tells the story.' : 'A lead established.'}</h1>
      <p className="chapter-complete-title">{completion.title}</p>
      <p className="chapter-complete-report">{completion.report}</p>
      <p className="chapter-accepted">Correct conclusion · Report accepted</p>
    </div>
    <button className="primary" onClick={onContinue}>{completion.final ? 'Read the final report' : briefing ? 'Read the new note' : 'Continue the enquiry'}</button>
  </ScenePanel>;
}
