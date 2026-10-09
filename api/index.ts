import type { IncomingMessage, ServerResponse } from 'node:http';
import { createGateway } from '../backend/src/application.js';

let gateway: ReturnType<typeof createGateway> | undefined;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  gateway ??= createGateway().catch(error => { gateway = undefined; throw error; });
  const app = await gateway;
  app(req, res);
}
