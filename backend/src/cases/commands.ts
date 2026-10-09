import { z } from 'zod';

const authoredId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/);
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('wave'), heading: z.number().finite() }),
  z.object({ type: z.literal('hint'), leadId: authoredId }),
  z.object({ type: z.literal('followLead'), leadId: authoredId, following: z.boolean() }),
  z.object({ type: z.literal('selectInspector'), inspector: authoredId }),
  z.object({ type: z.literal('ready'), ready: z.boolean() }),
  z.object({ type: z.literal('continueStage') }),
  z.object({ type: z.literal('cutscene'), command: z.object({ type: z.enum(['ready', 'advance', 'skip']), runId: z.string().min(1).max(100), index: z.number().int().min(0) }) }),
  z.object({
    type: z.literal('move'),
    x: z.number().finite().min(-100).max(100),
    z: z.number().finite().min(-100).max(100),
    moving: z.boolean().optional(),
    heading: z.number().finite().optional(),
  }),
  z.object({ type: z.literal('activity'), activity: z.enum(['investigating', 'casebook']) }),
  z.object({ type: z.literal('travel'), location: authoredId }),
  z.object({ type: z.literal('inspect'), clueId: authoredId }),
  z.object({ type: z.literal('examineObject'), objectId: authoredId, stepId: authoredId }),
  z.object({ type: z.literal('begin'), npcId: authoredId }),
  z.object({ type: z.literal('end'), npcId: authoredId }),
  z.object({ type: z.literal('question'), npcId: authoredId, text: z.string().trim().min(1).max(500), spoken: z.boolean().optional(), evidenceId: authoredId.optional() }),
  z.object({ type: z.literal('ask'), npcId: authoredId, topicId: authoredId }),
  z.object({
    type: z.literal('answer'),
    npcId: authoredId,
    topicId: authoredId,
    approach: z.enum(['reassure', 'press', 'challenge']),
    evidenceId: authoredId.optional(),
  }),
  z.object({
    type: z.literal('deduce'),
    evidenceIds: z.tuple([authoredId, authoredId]),
    sequence: z.array(authoredId).min(2).max(20).optional(),
  }),
  z.object({ type: z.literal('note'), text: z.string().trim().min(1).max(500) }),
  z.object({ type: z.literal('finalReport'), findings: z.array(authoredId).max(40) }),
  z.object({ type: z.literal('chapterVote'), answer: authoredId }),
  z.object({ type: z.literal('heartbeat') }),
]);


export const commandSchema = z.object({ requestId: z.string().uuid(), action: actionSchema });
