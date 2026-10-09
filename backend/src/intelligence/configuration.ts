import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

export function configureIntelligence() {
  if (existsSync('.env.local')) loadEnvFile('.env.local');
  const enabled = process.env.AI_MODE === 'live' || (process.env.AI_MODE !== 'authored' && !!process.env.TYPESAFE_API_KEY && !!process.env.FAL_KEY);
  return { enabled };
}
