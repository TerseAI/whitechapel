import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, '../assets/documents');
const { documents } = await import('./documents.mjs');
const production = JSON.parse(await readFile(resolve(here, 'paper-production.json'), 'utf8'));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 }, deviceScaleFactor: 1 });
const images = Object.fromEntries(await Promise.all(['wedding-photo', 'newspaper-woodcut'].map(async id => [id, `data:image/png;base64,${(await readFile(resolve(here, `../assets/art/${id}.png`))).toString('base64')}`])));
let assets = {};
try { assets = JSON.parse(await readFile(resolve(here, 'document-assets.json'),'utf8')); } catch {}
for (const [id, document] of Object.entries(documents)) {
  for (const paper of document.pages) {
    if (process.argv[2] && process.argv[2] != paper.artwork) continue;
    if (!paper.artwork.endsWith('-front')) {
      await preserveReviewedPaper(paper);
      continue;
    }
    await page.setContent(render(id, paper));
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.locator('article').evaluate(el => el.scrollHeight > el.clientHeight + 2);
    if (overflow) throw new Error(`Paper content overflows: ${paper.artwork}`);
    const png = resolve(output, `${paper.artwork}.png`);
    await page.screenshot({ path: png });
    execFileSync('magick', [png, '-quality', '94', resolve(output, `${paper.artwork}.webp`)]);
    assets[paper.artwork] = { src: `documents/${paper.artwork}.webp`, width: 1200, height: 1600, description: paper.description ?? `${document.title}, ${paper.label}. Fictional illustrated original.` };
    console.log(paper.artwork);
  }
}
await browser.close();
await writeFile(resolve(here, 'document-assets.json'), JSON.stringify(assets, null, 2) + '\n');

async function preserveReviewedPaper(paper) {
  const record = production.artworks[paper.artwork];
  const digest = value => createHash('sha256').update(value).digest('hex');
  if (!record?.reviewed || record.pageSha256 !== digest(JSON.stringify(paper))) {
    throw new Error(`Review the illustrated original against current text: ${paper.artwork}`);
  }
  for (const extension of ['png', 'webp']) {
    const bytes = await readFile(resolve(output, `${paper.artwork}.${extension}`));
    if (digest(bytes) !== record[`${extension}Sha256`]) throw new Error(`Unreviewed artwork: ${paper.artwork}.${extension}`);
  }
  const [width, height] = record.dimensions;
  assets[paper.artwork] = { ...assets[paper.artwork], width, height };
  console.log(`Preserved reviewed original: ${paper.artwork}`);
}

function render(id, paper) {
  let kind = 'letter';
  let content = letter(id, paper);
  if (id.includes('wedding')) { kind = id; content = photograph(paper, id.startsWith('torn')); }
  if (id.includes('newspaper') || id === 'burned-report') { kind = id === 'burned-report' ? 'newspaper burned' : 'newspaper'; content = newspaper(id === 'burned-report'); }
  if (paper.artwork === 'travel-sleeve-original') { kind = 'travel'; content = ticket(paper); }
  if (id === 'finch-work-card') { kind = 'work-card'; content = workCard(paper); }
  return `<!doctype html><meta charset="utf-8"><style>${style()}</style><main><article class="${kind}">${content}<div class="fibers"></div></article></main>`;
}

function letter(id, paper) {
  const header = paper.kicker ? `<header>${escape(paper.kicker)}</header>` : '';
  const subject = ['orders','medical-findings'].includes(id) ? `<h1>${escape(paper.heading)}</h1>` : '';
  return `${header}${paper.date ? `<div class="date">${escape(paper.date)}</div>` : ''}${subject}<section class="writing ${id}">${(paper.paragraphs ?? []).map(p => `<p>${escape(p)}</p>`).join('')}${paper.signature ? `<footer>${escape(paper.signature).replaceAll('\n','<br>')}</footer>` : ''}</section>`;
}

function photograph(paper, torn) {
  if (paper.artwork.endsWith('front')) return `<img class="photo ${torn ? 'torn' : ''}" src="${images['wedding-photo']}">`;
  return `<div class="card-back ${torn ? 'torn-back' : ''}"><div class="back-writing">${paper.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</div></div>`;
}

function newspaper(burned) {
  const paper = documents['inn-newspaper'].pages[0];
  return `${burned ? burnContour() : ''}<div class="news-content"><header>The Evening London Illustrated</header><div class="edition">Friday, 16 November 1888 <span>One penny</span></div><h1>${escape(paper.paragraphs[0])}</h1><p class="news-lead">${escape(paper.paragraphs[1])}</p><img class="woodcut" src="${images['newspaper-woodcut']}"><p class="caption">${escape(paper.paragraphs[2])}</p><p class="last-column">${escape(paper.paragraphs[3])}</p></div>`;
}

function burnContour() {
  const points = '23,31 339,0 723,46 1028,0 1085,138 1107,535 1062,658 1118,841 1073,1071 1118,1178 1085,1285 926,1255 768,1331 588,1270 418,1316 203,1285 57,1255 0,1071 34,780 0,444';
  return `<svg class="charred-rim" viewBox="0 0 1130 1530"><defs><filter id="char"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="4" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="14"/></filter></defs><polygon points="${points}" fill="none" stroke="#302921" stroke-width="35" filter="url(#char)"/><polygon points="${points}" fill="none" stroke="#605042" stroke-width="52" opacity=".35" filter="url(#char)"/></svg>`;
}

function ticket(paper) {
  return `<div class="sleeve"><div class="fold"></div><p>${escape(paper.fields[1][1]).replace(' · ', '<br>')}</p><small>${escape(paper.fields[2][1])}</small></div><div class="ticket"><strong>G.W.R.</strong><b>PADDINGTON TO BRISTOL</b><span>THIRD CLASS</span><em>SINGLE</em></div>`;
}

function workCard(paper) {
  return `<header>${escape(paper.kicker)}</header><h1>${escape(paper.heading)}</h1><section class="work-fields">${paper.fields.map(([k,v])=>`<p><span>${escape(k)}</span><b>${escape(v)}</b></p>`).join('')}</section><table><thead><tr>${paper.table.columns.map(c=>`<th>${escape(c)}</th>`).join('')}</tr></thead><tbody>${paper.table.rows.map(row=>`<tr>${row.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function escape(text) { return String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

function style() {
  return `*{box-sizing:border-box}html,body{margin:0;width:1200px;height:1600px}body{background:#272828}main{padding:35px;width:100%;height:100%;background:radial-gradient(ellipse at center,#353637,#232424)}article{position:relative;width:1130px;height:1530px;padding:80px 95px;color:#26333b;background:#e4e2d7;box-shadow:0 10px 26px #0008;overflow:hidden;clip-path:polygon(.3% .3%,99.3% 0,100% 99.5%,.1% 100%);isolation:isolate}article:before{content:'';position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#7771,transparent 4%,transparent 97%,#68665328),linear-gradient(0deg,transparent 32%,#6d6c6233 32.2%,#fff9 32.45%,transparent 32.8%,transparent 65%,#73736b22 65.3%,#fff8 65.5%,transparent 66%);pointer-events:none}.fibers{position:absolute;inset:0;pointer-events:none;opacity:.095;mix-blend-mode:multiply;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.7'/%3E%3C/svg%3E")}header{font-family:'Baskerville',serif;font-size:27px;text-align:center;text-transform:uppercase;letter-spacing:2px;margin-bottom:35px;color:#343733}h1{font:36px 'Baskerville',serif;font-weight:normal;margin:30px 0 40px;text-align:center}.date{font:36px 'Snell Roundhand',cursive;text-align:right;margin:12px 4px 32px}.writing{font:43px/1.27 'Snell Roundhand',cursive;letter-spacing:.15px;transform:rotate(-.12deg)}p{margin:0 0 24px}.writing p:nth-child(2n){transform:rotate(.1deg)}.writing.work-correspondence,.writing.closing-letter{font-family:'Apple Chancery',cursive;font-size:38px;line-height:1.32}.writing.medical-findings{font-family:'Apple Chancery',cursive;font-size:37px;line-height:1.34}.writing.orders{font-size:42px}footer{font:49px/1.04 'Snell Roundhand',cursive;margin:40px 0 0 44%;transform:rotate(-1deg)}.complete-wedding,.torn-wedding{background:transparent;padding:0;box-shadow:none;clip-path:none}.complete-wedding:before,.torn-wedding:before{display:none}.photo{display:block;width:1130px;height:1530px;object-fit:contain}.torn{clip-path:polygon(0 0,61% 0,60% 8%,61.8% 12%,60.4% 18%,62% 26%,61% 34%,61.6% 42%,60.5% 53%,62% 62%,61.4% 72%,64% 82%,68% 89%,67% 100%,0 100%)}.card-back{position:absolute;inset:18px 30px;background:#dbd7c9;box-shadow:0 0 18px #0007;border-radius:10px}.back-writing{position:absolute;top:360px;left:80px;right:65px;transform:rotate(-3deg);font:43px/1.6 'Snell Roundhand',cursive;color:#333d42}.torn-back{clip-path:polygon(0 0,61% 0,60% 8%,61.8% 12%,60.4% 18%,62% 26%,61% 34%,61.6% 42%,60.5% 53%,62% 62%,61.4% 72%,64% 82%,68% 89%,67% 100%,0 100%)}.torn-back .back-writing{left:45px;width:540px;font-size:40px}.newspaper{padding:58px 68px;background:#deddd2;color:#292b29;font-family:'Times New Roman',serif}.newspaper header{font-size:48px;font-weight:bold;line-height:1.15;letter-spacing:-.8px;margin:0 0 20px;border-bottom:4px double #353530;padding-bottom:20px;text-transform:uppercase}.edition{font-size:23px;border-bottom:2px solid #55574f;padding:4px 0 16px}.edition span{float:right}.newspaper h1{font:bold 45px 'Times New Roman',serif;margin:36px 0 28px;letter-spacing:1px}.news-lead{font-size:31px;line-height:1.35;text-align:justify}.woodcut{width:100%;height:580px;object-fit:cover;mix-blend-mode:multiply;filter:contrast(1.12)}.caption{font-size:26px;line-height:1.25;margin:20px 0;text-align:center;font-style:italic}.last-column{font-size:29px;line-height:1.4;margin-top:45px;border-top:1px solid #555;padding-top:25px}.burned{clip-path:polygon(2% 2%,30% 0,64% 3%,91% 0,96% 9%,98% 35%,94% 43%,99% 55%,95% 70%,99% 77%,96% 84%,82% 82%,68% 87%,52% 83%,37% 86%,18% 84%,5% 82%,0 70%,3% 51%,0 29%);box-shadow:inset 0 0 50px 20px #221812}.burned .last-column{visibility:hidden}.charred-rim{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2}.burned:after{content:'';position:absolute;inset:0;box-shadow:inset 0 0 40px 20px #211a16;pointer-events:none}.travel{background:transparent;padding:0;clip-path:none}.travel:before{display:none}.sleeve{position:absolute;left:90px;right:80px;top:120px;height:610px;background:#e5e2d7;transform:rotate(-2deg);box-shadow:3px 8px 18px #0006;padding:130px 100px;color:#2b3840}.sleeve p{font:59px/1.45 'Snell Roundhand',cursive}.sleeve small{font:39px 'Snell Roundhand',cursive}.fold{position:absolute;top:0;left:0;right:0;height:90px;border-bottom:1px solid #b2b0a4;background:linear-gradient(#eeeade,#d5d2c8)}.ticket{position:absolute;top:870px;left:200px;width:735px;height:365px;background:#cbbbad;border:1px solid #9e9085;box-shadow:4px 8px 12px #0007;transform:rotate(2deg);text-align:center;color:#292724;font-family:'Times New Roman',serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px}.ticket:after{content:'';position:absolute;inset:16px;border:2px solid #504841}.ticket strong{font-size:48px;letter-spacing:7px}.ticket b{font-size:31px;letter-spacing:2px}.ticket span{font-size:31px;letter-spacing:4px}.ticket em{font-size:27px;font-style:normal;letter-spacing:4px}.work-card{height:1120px;margin-top:160px;background:#dad9ca;padding:85px}.work-card header{font-size:39px}.work-card h1{font-size:30px}.work-fields{font:38px 'Apple Chancery',cursive;margin:55px 0}.work-fields p{display:flex;gap:55px;border-bottom:1px solid #879296;padding-bottom:22px}.work-fields span{font:27px 'Times New Roman',serif;width:110px;align-self:center}.work-fields b{font-weight:normal}table{border-collapse:collapse;width:100%;font:35px 'Apple Chancery',cursive}th{font:26px 'Times New Roman',serif;text-align:left}th,td{padding:28px 20px;border:1px solid #78888b}tr{height:120px}`;
}
