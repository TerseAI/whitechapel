import { readFile, writeFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const brief = JSON.parse(await readFile(resolve(here, 'media-brief.json'), 'utf8'));
const existing = JSON.parse(await readFile(resolve(here, 'assets.json'), 'utf8').catch(() => '{"assets":{}}'));
const assets = { ...existing.assets, ...JSON.parse(await readFile(resolve(here, 'document-assets.json'), 'utf8')) };
const aliases = { 'opening-trunk':'trunk-closed', 'hearth-clothing':'hearth-surface', 'room-packing':'room-packing-v2', 'room-blood':'room-blood-v2' };
const missing = [];
for (const [id, description] of Object.entries({ 'lantern-cover':'The fictional Lantern inn on the evening before the enquiry.', ...brief.objectArtwork })) {
  const src = assets[id]?.src ?? `art/${aliases[id] ?? id}.webp`;
  const path = resolve(here, '../assets', src);
  try { await access(path); } catch { missing.push(id); continue; }
  const [width,height] = execFileSync('magick', ['identify','-format','%w %h',path], {encoding:'utf8'}).trim().split(' ').map(Number);
  assets[id] = {src,width,height,description};
}
try { Object.assign(assets, JSON.parse(await readFile(resolve(here,'portrait-assets.json'),'utf8'))); } catch {}
let voices = {};
try { voices = JSON.parse(await readFile(resolve(here,'voices.json'),'utf8')); } catch {}
let music = {};
try { music = JSON.parse(await readFile(resolve(here,'music.json'),'utf8')); } catch {}
await writeFile(resolve(here,'assets.json'), JSON.stringify({ assets, voices, cover:'lantern-cover', ...music },null,2)+'\n');
console.log(JSON.stringify({images:Object.keys(assets).length,voices:Object.keys(voices).length,missing}));
