import type { InvestigatorId } from './investigators.js';
import type { Inspector } from '../story/types.js';
import type { Action, CaseView, Player } from './types.js';
import { investigatorCount, type CaseMode } from './case-mode.js';

export function chooseInspector(members: Player[], playerId: string, role: InvestigatorId, inspectors: readonly Inspector[]) {
  const inspector = inspectors.find(item => item.id === role);
  if (!inspector) return 'Choose an available inspector.';
  const player = members.find(member => member.id === playerId);
  if (!player) return 'Join the case first.';
  if (members.some(member => member.id !== playerId && member.selected && member.role === role)) return 'Your partner has already chosen that inspector.';
  player.role = role;
  player.name = inspector.name;
  player.selected = true;
  player.ready = false;
}

export function canStartCase(members: readonly Player[], connected: readonly string[], mode: CaseMode = 'co-op') {
  return members.length === investigatorCount(mode) && new Set(members.map(member => member.role)).size === members.length
    && members.every(member => member.selected && member.ready && connected.includes(member.id));
}

export function gameplayBlock(phase: CaseView['phase'], action: Action['type'], mode: CaseMode = 'co-op') {
  if (action === 'heartbeat') return;
  if (phase === 'lobby') return ['selectInspector', 'ready'].includes(action) ? undefined : mode === 'solo' ? 'Choose your inspector and begin the case first.' : 'Both inspectors must join, choose a character and be ready before the enquiry begins.';
  if (['selectInspector', 'ready'].includes(action)) return 'Inspector selection is closed for this case.';
  if (phase === 'cutscene') return action === 'cutscene' ? undefined : 'Finish the scene before continuing the enquiry.';
  if (action === 'cutscene') return 'There is no active cutscene.';
  if (phase === 'solved' && !['travel', 'end', 'move', 'activity'].includes(action)) return 'This case is closed. You can still explore and review your case map.';
}
