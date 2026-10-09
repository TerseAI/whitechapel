import { createHash, timingSafeEqual } from 'node:crypto';
import { CASE_STORAGE_VERSION } from '../../../shared/game/storage-version.js';

const casePrefix = `case--v${CASE_STORAGE_VERSION}--`;

export function entityActorId(caseId: string, entityId: string) {
  return `${entityId}--${entityDigest(caseId, entityId)}`;
}

export const conversationActorId = (caseId: string, entityId: string) => `conversation--${entityDigest(caseId, entityId)}`;

export const caseActorId = (caseId: string) => `${casePrefix}${caseId}`;

export function caseIdFromActorId(actorId: string) {
  if (!actorId.startsWith(casePrefix) || actorId.length === casePrefix.length) throw new Error('Invalid case actor address.');
  return actorId.slice(casePrefix.length);
}

function entityDigest(caseId: string, entityId: string) {
  return createHash('sha256').update(JSON.stringify([CASE_STORAGE_VERSION, caseId, entityId])).digest('hex');
}

export const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

export function validSecret(secret: string, expected: string) {
  const actual = hashSecret(secret);
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export const wire = <T>(value: T): T => JSON.parse(JSON.stringify(value));
