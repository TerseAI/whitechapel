import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(await readFile(resolve(here,'expected-voices.json'),'utf8'));
const lines = expected.map(line => ({
  id: line.id,
  actor: line.speakerId.replace(/^player-/, '').replace(/-(arrival|closing|inn|station)$/, ''),
  text: line.text,
  sha256: createHash('sha256').update(line.text).digest('hex'),
}));
await writeFile(resolve(here,'voice-script.json'),JSON.stringify(lines,null,2)+'\n');
console.log(JSON.stringify({ clips:lines.length, uniqueRecordings:new Set(lines.map(line=>`${line.actor}-${line.sha256}`)).size }));
