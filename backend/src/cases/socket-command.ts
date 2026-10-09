import type { Action, ActionResult } from '../../../shared/game/types.js';
import type { CaseEvent } from '../../../shared/game/case-socket.js';
import type { Identity } from './identity.js';
import { commandSchema } from './commands.js';

type CommandSocket = { metadata: Identity; send(message: CaseEvent): void };
type Act = (identity: Identity, requestId: string, action: Action) => Promise<ActionResult>;

export async function handleCaseCommand(socket: CommandSocket, message: unknown, act: Act) {
  const command = commandSchema.safeParse(message);
  const requestId = command.success ? command.data.requestId : (message as { requestId?: string })?.requestId;
  if (typeof requestId !== 'string') return;
  let result: ActionResult = { ok: false, message: 'This action is incomplete. Please try again.' };
  if (command.success) {
    try { result = await act(socket.metadata, requestId, command.data.action); }
    catch { result = { ok: false, message: 'The action could not be saved. Reconnect and try again.' }; }
  }
  socket.send({ type: 'result', requestId, result: JSON.parse(JSON.stringify(result)) });
}
