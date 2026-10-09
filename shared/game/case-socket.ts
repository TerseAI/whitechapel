import type { Action, ActionResult, CaseView } from './types.js';

export type CaseCommand = { requestId: string; action: Action };
export type CaseEvent =
  | { type: 'update'; state: CaseView }
  | { type: 'result'; requestId: string; result: ActionResult };
export type CaseSocketGrant = { websocketUrl: string; connectByMs: number; liveInterviews: boolean };
