import type { Reply } from '../../../shared/game/types.js';

export function remember(previous: Reply[], replies: Reply[]): Reply[] {
  return [...new Map([...previous, ...replies].map(reply => [reply.id, reply])).values()].sort((a, b) => a.at - b.at);
}
