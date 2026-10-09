import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LocalGameData } from '../frontend/src/story/local-game-data';

test('reset clears all saved game sessions and preferences without touching unrelated storage', () => {
  const values = new Map([
    ['investigation.v5.example.1.last', 'room'],
    ['investigation.v5.example.1.room', '{"playerId":"one"}'],
    ['investigation.v5.example.1.briefing.room.one.0', 'seen'],
    ['investigation.example.1.reviewed.room.one', '["clue"]'],
    ['investigation.v2.example.1.last', 'old-room'],
    ['investigation.volume.music', '0.8'],
    ['investigation.documents.view', 'original'],
    ['investigation.controls-dismissed', 'true'],
    ['unrelated-app.session', 'keep'],
    ['investigation-tools', 'keep too'],
  ]);
  const data = new LocalGameData(() => ({
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
  }));
  data.clear();
  assert.deepEqual([...values], [['unrelated-app.session', 'keep'], ['investigation-tools', 'keep too']]);
  data.clear();
  assert.equal(values.size, 2);
});

test('a blocked browser store reports failure instead of claiming a successful reset', () => {
  const data = new LocalGameData(() => { throw new Error('Storage unavailable'); });
  assert.throws(() => data.clear(), /Storage unavailable/);
});
