import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { cloudHostEnvironment } from './cloud-host.ts';

if (existsSync('.env.local')) loadEnvFile('.env.local');
let child;
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { stopping = true; child?.kill(signal); });

try {
  const env = cloudHostEnvironment(process.env);
  if (await run('npm', ['run', 'build'], env) === 0 && !stopping) {
    console.log(`Cloud actors: ${env.TERSE_ACTOR_URL}`);
    console.log(`Share over HTTPS: cloudflared tunnel --config /dev/null --url http://127.0.0.1:${env.PORT}`);
    process.exitCode = await run(process.execPath, ['--import', 'tsx', 'backend/src/index.ts'], env);
  } else if (!stopping) process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

async function run(command, args, env) {
  child = spawn(command, args, { env, stdio: 'inherit' });
  const [code] = await once(child, 'exit');
  return code ?? (stopping ? 0 : 1);
}
