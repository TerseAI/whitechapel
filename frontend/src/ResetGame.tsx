import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { ScenePanel } from './ScenePanel';
import { LocalGameData } from './story/local-game-data';
import './reset-game.css';

const localGameData = new LocalGameData(() => localStorage);

export function ResetGame() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const reset = () => {
    try {
      localGameData.clear();
      setResetting(true);
      window.location.replace(window.location.pathname);
    } catch {
      setError('Browser data could not be cleared. Allow site storage in your browser settings, then try again.');
    }
  };
  return <>
    <button className="reset-game-trigger" type="button" onClick={() => { setError(''); setOpen(true); }}><RotateCcw size={15} aria-hidden="true"/>Reset game</button>
    {open && <ScenePanel className="reset-game-dialog" label="Reset game?" onClose={() => setOpen(false)}>
      <h2>Reset game?</h2>
      <p>This clears your saved case access and preferences from this browser, then returns you to the start screen.</p>
      <p>You won’t be able to resume these cases here. Your partner’s cloud case is kept; to restart together, create a new case and share its invitation.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="reset-game-actions">
        <button className="secondary" type="button" autoFocus disabled={resetting} onClick={() => setOpen(false)}>Cancel</button>
        <button className="primary" type="button" disabled={resetting} onClick={reset}>{resetting ? 'Resetting…' : 'Clear data and restart'}</button>
      </div>
    </ScenePanel>}
  </>;
}
