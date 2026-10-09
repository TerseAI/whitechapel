import assert from 'node:assert/strict';
import { test } from 'node:test';
import { overlayConversation } from '../frontend/src/game/conversation-overlay';
import type { CaseView, Reply } from '../shared/game/types';

test('conversation broadcasts merge accepted dialogue without replacing case authority', () => {
  const reply = { id: 'reply', npcId: 'witness', at: 2 } as Reply;
  const state = { revision: 5, evidence: [{ id: 'case-evidence' }], npcs: [{ id: 'witness', replies: [reply], pendingTurn: { id: 'reply' } }, { id: 'other', replies: [] }] } as unknown as CaseView;
  const updated = overlayConversation(state, { entityId: 'stable-witness', revision: 50, replies: [reply], result: { ok: true, message: '', reply } });
  assert.equal(updated.npcs[0].replies.length, 1);
  assert.equal(updated.npcs[0].pendingTurn, undefined);
  assert.equal(updated.revision, 5);
  assert.equal(updated.evidence, state.evidence);
  assert.equal(updated.npcs[1], state.npcs[1]);
});
