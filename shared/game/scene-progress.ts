import type { GamePlace, NpcView } from './types.js';
import { topicReply } from './interviews.js';

export function sceneProgress(place: GamePlace, found: readonly string[], npcs: readonly NpcView[]) {
  const objectsExamined = place.hotspots.filter(h => found.includes(h.id)).length;
  const witnesses = npcs.filter(n => n.location === place.id);
  const interviewsExamined = witnesses.filter(n => n.topics.length > 0 && n.topics.every(t => topicReply(n, t.id) || (t.documentId && found.includes(t.documentId)))).length;
  return {
    objectsExamined,
    interviewsExamined,
    interviewsTotal: witnesses.length,
    complete: objectsExamined === place.hotspots.length && interviewsExamined === witnesses.length,
  };
}
