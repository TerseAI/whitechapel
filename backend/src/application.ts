import { randomBytes } from 'node:crypto';
import { DurableCaseRepository } from './actors/case-repository.js';
import { CaseService } from './cases/case-service.js';
import { createApp } from './http/app.js';
import { configureIntelligence } from './intelligence/configuration.js';

export async function createGateway(staticDirectory?: string) {
  const rooms = new DurableCaseRepository();
  const intelligence = configureIntelligence();
  const service = new CaseService(rooms, newCredentials, intelligence.enabled);
  return createApp(service, staticDirectory);
}

function newCredentials() {
  return { roomId: randomBytes(12).toString('hex'), playerId: randomBytes(12).toString('hex'), secret: randomBytes(32).toString('hex') };
}
