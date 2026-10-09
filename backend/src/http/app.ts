import { loadedStory } from '../active-story.js';
import { publicStory } from '../../../shared/story/definition.js';
import express from 'express';
import { z } from 'zod';
import { resolve } from 'node:path';
import type { CaseService } from '../cases/case-service.js';
import { handleRequestError } from './errors.js';
import { apiRateLimit } from './rate-limit.js';
import { commandSchema, createCaseSchema, roomSchema, session } from './requests.js';

export function createApp(service: CaseService, staticDirectory?: string) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));
  app.use(securityHeaders);
  app.use('/api', apiRateLimit());
  app.get('/api/story', (_req, res) => res.json(publicStory(loadedStory.story)));
  app.use(`/story-assets/${loadedStory.story.id}/${loadedStory.story.version}`, express.static(loadedStory.assetsDirectory, { dotfiles: 'deny' }));
  app.use('/story-assets', (_req, res) => { res.status(404).send('Story asset not found.'); });
  registerCaseRoutes(app, service);
  if (staticDirectory) serveFrontend(app, staticDirectory);
  app.use(handleRequestError);
  return app;
}

function securityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
}

function registerCaseRoutes(app: express.Express, service: CaseService) {
  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, game: loadedStory.story.title, stateEngine: 'durable-actors@0.7.16' }),
  );
  app.post('/api/cases', async (req, res) => {
    const { roomId, mode } = createCaseSchema.parse(req.body);
    res.status(201).json(await service.create('Choose an inspector', roomId, mode));
  });
  app.get('/api/cases/:roomId', async (req, res) => {
    res.json(await service.snapshot(roomSchema.parse(req.params.roomId), session(req)));
  });
  app.post('/api/cases/:roomId/actions', async (req, res) => {
    const identity = session(req);
    const roomId = roomSchema.parse(req.params.roomId);
    const { requestId, action } = commandSchema.parse(req.body);
    res.json(await service.act(roomId, identity, requestId, action));
  });
  app.post('/api/cases/:roomId/conversation-socket', async (req, res) => {
    const { npcId } = z.object({ npcId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/) }).parse(req.body);
    res.setHeader('Cache-Control', 'no-store');
    res.json(await service.prepareConversationSocket(roomSchema.parse(req.params.roomId), session(req), npcId));
  });
  app.post('/api/cases/:roomId/scene-socket', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await service.prepareSceneSocket(roomSchema.parse(req.params.roomId), session(req)));
  });
  app.post('/api/cases/:roomId/socket', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await service.prepareSocket(roomSchema.parse(req.params.roomId), session(req)));
  });
}

function serveFrontend(app: express.Express, directory: string) {
  app.use(express.static(directory));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(directory, 'index.html')));
}
