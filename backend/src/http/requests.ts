import type express from 'express';
import { z } from 'zod';

export const roomSchema = z.string().regex(/^[a-f0-9]{24}$/);
const identitySchema = z.object({
  playerId: z.string().regex(/^[a-f0-9]{24}$/),
  secret: z.string().regex(/^[a-f0-9]{64}$/),
});
export { actionSchema, commandSchema } from '../cases/commands.js';

export const createCaseSchema = z.object({ roomId: roomSchema.optional(), mode: z.enum(['co-op', 'solo']).default('co-op') });

export function session(req: express.Request) {
  return identitySchema.parse({
    playerId: req.headers['x-player-id'],
    secret: req.headers.authorization?.replace(/^Bearer /, ''),
  });
}
