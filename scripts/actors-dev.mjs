import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { startLocalActors } from 'terse-sdk/dev';

if (existsSync('.env.local')) loadEnvFile('.env.local');
const runtime = await startLocalActors({
  apiKey: process.env.DURABLE_ACTORS_API_KEY ?? randomBytes(32).toString('hex'),
  entrypoint: 'backend/src/durable-objects.ts', dataDir: process.env.FRAMEWORK_DATA_DIR ?? '.durable-actors', port: 7188,
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void runtime.stop(); });
console.log(`Local actors ready at ${runtime.connection.controlPlaneUrl}. Use npm run dev to launch the gateway and game together.`);
await runtime.closed;
