import { mkdir, writeFile } from 'node:fs/promises';
const assets = ['dark_brick_wall', 'cobblestone_floor_08'];
await mkdir('frontend/public/materials', { recursive: true });
const manifest = [];
for (const id of assets) {
  const response = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!response.ok) throw new Error(`Cannot retrieve ${id}`);
  const data = await response.json();
  for (const [channel, file] of [['Diffuse', 'color'], ['nor_gl', 'normal'], ['Rough', 'roughness']]) {
    const source = data[channel]['1k'].jpg;
    const download = await fetch(source.url);
    if (!download.ok) throw new Error(`Cannot download ${source.url}`);
    await writeFile(`frontend/public/materials/${id}-${file}.jpg`, Buffer.from(await download.arrayBuffer()));
    manifest.push({ asset: id, channel, source: source.url, licence: 'CC0-1.0', sourcePage: `https://polyhaven.com/a/${id}` });
    console.log(`Downloaded ${id} ${file}`);
  }
}
await writeFile('frontend/public/materials/sources.json', JSON.stringify(manifest, null, 2));
