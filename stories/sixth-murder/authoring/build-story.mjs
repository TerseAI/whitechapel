import { guidance } from './guidance.mjs';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { documents, objectArtwork } from './documents.mjs';
import { clues, objects, deductions, reconstructions } from './evidence.mjs';
import { characters } from './dialogue.mjs';
import { lanternBriefingStaging } from './cutscene-staging.mjs';
import { dialogueOverview } from './export-dialogue.mjs';
import { giveCharactersMinds } from './minds.mjs';

const directory = fileURLToPath(new URL('../', import.meta.url));
const scenes = fragment('scenes.json');
const media = fragment('assets.json');
const starter = JSON.parse(readFileSync(new URL('../../starter/story.json', import.meta.url), 'utf8'));
const locations = authoredLocations();
const enquiryDeductions = ['trunk-movement', 'room-to-yard', 'concealed-marriage', 'candlestick-origin', 'disturbance-sequence'];
const searchDeductions = ['report-edition', 'false-knife', 'staged-resemblance'];
const enquiryEvidence = ['hale-private-recovery', 'courtyard-knife', 'hale-discovery', 'george-discovery', 'arthur-visit', 'arthur-trunk-reply', 'travel-papers', 'medical-findings', 'maggie-separation', 'address-verified'];
const story = {
  $schema: '../story.schema.json', schemaVersion: 2, id: 'sixth-murder', version: '6',
  title: 'Whitechapel', subtitle: 'The Sixth Murder',
  description: 'A case for two investigators. Whitechapel, November 1888: an evening’s lodging becomes an enquiry into a woman’s death and the life she meant to begin. An original fictional mystery set against the historical murder enquiry.',
  ...(media.cover ? { cover: media.cover } : {}), ...(media.music ? { music: media.music } : {}),
  assets: media.assets ?? {}, models: scenes.models ?? {}, inspectors: starter.inspectors, sites: scenes.sites ?? {}, voices: media.voices ?? {},
  chapters: [
    chapter('Arrival', 'Friday, 16 November 1888 · Evening', 'Hale has arranged discreet lodgings while you assist the Whitechapel enquiry. Meet the people at the Lantern before retiring.', 'Settle into the rooms, speak to Nora and establish the luggage arrangement.', ['lantern-common', 'lantern-yard'], ['baines-arrival', 'nora', 'george-arrival'], ['lodging-arranged', 'nora-plans', 'collection-arranged'], [], {
      entry: 'lantern-common', completion: { kind: 'continue', label: 'Retire for the evening' }, after: { target: 'advance', cutscene: 'morning' },
    }, { briefing: 'orders' }, 0),
    chapter('The enquiry', 'Saturday, 17 November 1888 · Morning', 'Nora has been found dead in the rear yard. The body has been removed; her luggage and the accounts of those at the inn remain.', 'Establish what happened in Nora’s room, how her trunk was moved and why Arthur concealed his relationship to her.', ['lantern-yard', 'lantern-common', 'nora-room', 'baines-room', 'alden-workroom', 'shaw-workshop'], ['hale', 'george', 'baines', 'arthur-inn', 'alden', 'maggie'], enquiryEvidence, enquiryDeductions, {
      entry: 'lantern-common', completion: { kind: 'findings', options: [
        option('night-movement', 'Baines saw an unidentified man carrying the trunk after a disturbance. Its stained contents and the room traces support moving Nora into the yard.'),
        option('concealed-relationship', 'Arthur concealed that he was Nora’s husband; the marriage, separation and verified address give context for his visit and a place to search.'),
        option('george-cart-proof', 'The candlestick was in George’s cart, so George must have killed Nora.'),
        option('marriage-alone', 'The wedding photograph alone is sufficient to prove Arthur killed Nora.'),
      ], supported: ['night-movement', 'concealed-relationship'], rejection: 'The cart was accessible overnight, and a marriage does not prove a killing. Bring together Arthur’s visit, the disturbed room, Baines’s limited observations, the trunk and the concealed relationship.' }, after: { target: 'advance', cutscene: 'search-arranged' },
    }, { report: 'The enquiry establishes an indoor disturbance and movement of the trunk by an unidentified man. Arthur admits visiting and arguing with Nora but concealed their marriage. His account and the verified shared address lead the enquiry to his lodgings; Baines has not identified him as the carrier. Hale will keep him at Commercial Street during the search.' }, 1),
    chapter('The search', 'Saturday, 17 November 1888 · Afternoon', 'Hale keeps Arthur at Commercial Street. His lodging has been secured for your search; earlier witnesses and rooms remain available.', 'Examine the burned clothing and newspaper. Compare Hale’s knife recovery with Alden’s findings and the illustrated report.', ['vale-room', 'lantern-yard', 'lantern-common', 'nora-room', 'baines-room', 'alden-workroom', 'shaw-workshop'], ['george', 'baines', 'alden', 'maggie'], ['hearth-clothing', 'burned-report', 'inn-newspaper', 'courtyard-knife', 'medical-findings'], searchDeductions, {
      entry: 'vale-room', completion: { kind: 'continue', label: 'Return to Commercial Street' }, after: { target: 'advance', cutscene: 'return-station' },
    }, { report: 'Arthur burned clothing and another copy of the inn’s report. Alden establishes a fatal blunt head injury and post-mortem knife wounds. The knife left beside Nora and the scarf arrangement support an inference of staging; the physical findings do not identify its author.' }, 2),
    chapter('Arthur’s account', 'Saturday, 17 November 1888 · Later', 'Put the evidence to Arthur and attend to what he volunteers. Compare his account with the recovery records and check any claimed source with Hale. His fullest account still denies the killing.', 'Establish the marriage with the complete photograph. Test Arthur’s knowledge and explanation, then put the medical and newspaper findings to him. Further admissions are optional.', ['station-interview'], ['arthur-station', 'hale-station'], ['station-relationship', 'station-trunk', 'station-fire', 'station-knowledge', 'station-cause', 'station-yard'], [...enquiryDeductions, ...searchDeductions, 'unshared-detail', 'source-excuse'], {
      entry: 'station-interview', completion: { kind: 'findings', options: [
        option('arthur-responsible', 'Arthur is responsible for Nora’s murder. His unshared knowledge, unsupported officer explanation and changing account join the marriage, motive and physical findings.'),
        option('concealment-established', 'The room, trunk, medical findings and witness accounts support movement and concealment. Deliberate imitation is our inference unless Arthur has admitted that purpose.'),
        option('george-responsible', 'George is responsible because his cart concealed the candlestick.'),
        option('ripper-identified', 'This enquiry identifies the offender in the other Whitechapel murders.'),
      ], supported: ['arthur-responsible', 'concealment-established'], rejection: 'The cart’s ownership does not connect George to the attack. This enquiry concerns Nora’s death; it does not identify the offender in the other Whitechapel murders. Distinguish the independent findings from the admissions actually recorded.' }, after: { target: 'advance', cutscene: 'return-lantern' },
    }, { report: 'Arthur Vale is responsible for Nora Vale’s murder. The fatal blunt injury, room and trunk traces support an attack indoors followed by movement and concealment. Arthur knew the candlestick’s unshared hiding place; Hale’s checked account contradicts his claimed source. This knowledge strengthens the case built from his visit, argument, concealed marriage and changing answers. The newspaper and discovery comparison support deliberate imitation as the investigators’ inference unless Arthur separately admitted that purpose. His recorded answers retain exactly the denials and admissions obtained.' }, 3),
    chapter('The same table', 'Saturday, 17 November 1888 · Evening', 'At the Lantern, Maggie is writing to Nora’s sister.', 'Speak to Maggie, then both close the enquiry.', ['lantern-common'], ['maggie-closing'], ['closing-addressed'], [], {
      entry: 'lantern-common', completion: { kind: 'continue', label: 'Close the enquiry' }, after: { target: 'finish', cutscene: 'the-same-table' },
    }, { report: 'The people at the Lantern have been told the enquiry is complete. Nora’s belongings remain secured pending their release and return to her sister.' }, 4),
  ],
  characters: giveCharactersMinds(characters).map(npc => ({ ...npc, entityId: npc.mind.identity })), clues, deductions, documents,
  objects: Object.fromEntries(Object.entries(objects).map(([id, object]) => [id, { ...object, ...scenes.objects?.[id] }])),
  reconstructions, cutscenes: cutscenes(),
  ending: 'Nora’s case is complete. An urgent message has been sent to her sister. Maggie’s letter and Nora’s belongings will follow. At the Lantern, the newspaper is set aside and Maggie returns to her letter. The historical Whitechapel murders remain unresolved.',
};
for (const [id, asset] of [['opening-cart', 'obj-cart'], ['opening-trunk', 'obj-trunk'], ['opening-sewing', 'obj-sewing-case'], ['opening-candlestick', 'obj-candlestick']]) {
  if (story.models[asset]) Object.assign(story.objects[id], { model: 'gltf', asset });
}
for (const npc of story.characters) {
  if (story.assets[`portrait-${npc.id}`]) npc.portrait = `portrait-${npc.id}`;
  if (npc.id === 'arthur-station') Object.assign(npc, { posture: 'seated', hatPlacement: 'lap', appearance: { ...npc.appearance, hat: 'bowler' } });
}
for (const scene of story.cutscenes) for (const [index, step] of scene.steps.entries()) {
  const clip = `cutscene-${scene.id}-${index}`;
  if (story.voices[clip]?.text === step.text) step.clip = clip;
}
writeFileSync(`${directory}story.json`, `${JSON.stringify(story, null, 2)}\n`);
writeFileSync(`${directory}authoring/media-brief.json`, `${JSON.stringify({ documents, objectArtwork }, null, 2)}\n`);
writeFileSync(`${directory}authoring/dialogue-review.json`, `${JSON.stringify(story.characters.map(({ id, name, greeting, topics }) => ({ id, name, greeting, topics })), null, 2)}\n`);
writeFileSync(`${directory}authoring/dialogue-script.md`, dialogueOverview(story.characters));
process.stdout.write(`Authored ${story.chapters.length} stages, ${story.characters.length} interview records, ${story.characters.reduce((n, npc) => n + npc.topics.length, 0)} topics, ${Object.keys(clues).length} evidence records and ${Object.keys(story.assets).length} registered images.\n`);

function fragment(name) { const path = `${directory}authoring/${name}`; return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}; }
function option(id, label) { return { id, label }; }
function chapter(title, date, opening, goal, placeIds, npcIds, requiredEvidence, deductionIds, flow, extra, index) {
  return { title, date, opening, goal, guidance: guidance[index], locations: placeIds.map(id => location(id, index)), npcIds, requiredEvidence, deductionIds, flow, epilogueLocations: [], epilogueNpcIds: [], clueIds: Object.values(clues).filter(clue => clue.chapter <= index).map(clue => clue.id), reviewEvidence: index === 0 ? [] : [...new Set([...requiredEvidence, ...deductionIds.flatMap(id => deductions.find(deduction => deduction.id === id).requires)])], question: '', options: [], acceptedAnswers: [], report: '', reportByAnswer: {}, ...extra };
}
function location(id, index) {
  const base = locations[id];
  const hotspotIds = id === 'lantern-common' ? index === 0 ? ['inn-newspaper', 'opening-sewing', 'opening-trunk', 'opening-candlestick'] : index === 4 ? [] : ['inn-newspaper'] : id === 'lantern-yard' && index === 0 ? ['opening-cart'] : base.hotspots;
  return { ...base, ...scenes.locations?.[id], hotspots: hotspotIds.map(id => ({ id, label: hotspotLabel(id), x: 50, y: 50 })) };
}
function hotspotLabel(id) {
  return { 'trunk-interior': 'Travelling trunk', 'cart-candlestick': 'Coal cart and sacks', 'hearth-clothing': 'Cold hearth', 'room-disturbance': 'Bed and displaced rug', 'torn-wedding': 'Sewing case', 'workshop-lead': 'Work correspondence', 'inn-newspaper': 'Illustrated newspaper', 'yard-discovery': 'Screened yard corner', 'travel-papers': 'Travelling papers', 'service-route': 'Service landing', 'window-view': 'Baines’s window', 'opening-sewing': 'The sleeve on the table', 'opening-trunk': 'Travelling trunk', 'opening-candlestick': 'The borrowed candlestick', 'opening-cart': 'The coal cart', 'unfinished-work': 'Unfinished work' }[id] ?? clues[id].title;
}
function authoredLocations() {
  return Object.fromEntries([
    place('lantern-common', 'lantern-inn', 'The Lantern · Common room', 'Lodging house near Commercial Street', 'A low coal fire, dark timber and the ordinary business of a lodging house. The front stairs lead to the inspectors’ rooms; the service passage reaches the low rear extension.', [], true),
    place('lantern-yard', 'lantern-inn', 'The Lantern · Rear yard', 'Service entrance and coal cart', 'The broad service steps end beside Nora’s trunk. A projecting washhouse screens the far corner; the cart stands where it was left after the coal delivery.', ['trunk-interior', 'cart-candlestick', 'yard-discovery'], false),
    place('nora-room', 'lantern-inn', 'The Lantern · Nora’s room', 'Low rear extension', 'An inexpensive room prepared for departure. A narrow bed, washstand and small travelling possessions occupy the space beside the service landing.', ['room-disturbance', 'torn-wedding', 'travel-papers', 'workshop-lead'], true),
    place('baines-room', 'lantern-inn', 'The Lantern · Rear landing', 'Baines’s door and window', 'Baines’s small room opens onto the short rear passage. Her window overlooks the landing and upper steps; the washhouse screens the discovery corner.', ['service-route', 'window-view'], true),
    { ...place('alden-workroom', 'alden-mortuary', 'Alden’s workroom', 'Adjoining the mortuary examination room', 'A plain workroom set aside for notes and conversation. The examination room lies beyond a closed door.', [], true), requiresAll: ['hale-discovery'] },
    { ...place('shaw-workshop', 'shaw-workshop', 'Shaw’s garment workshop', 'The long table by the window', 'Fabric and unfinished seams cover the worktable. Maggie has kept Nora’s allocation among the work still waiting to be done.', ['unfinished-work'], true), requiresAll: ['workshop-lead'] },
    place('vale-room', 'vale-lodgings', 'Arthur’s lodgings', 'Above Bell’s boot-repair shop', 'The occupied upstairs room is modest and close. Its cold hearth has not been cleared. Hale keeps Arthur at Commercial Street while you search.', ['hearth-clothing'], true),
    place('station-interview', 'commercial-street-station', 'Commercial Street station', 'Interview room', 'A private room, a plain table and the evidence already collected. Arthur waits with his hat on his knees.', [], true),
  ].map(place => [place.id, place]));
}
function place(id, siteId, name, subtitle, description, hotspots, indoor) { return { id, siteId, name, subtitle, description, hotspots, indoor, scene: indoor ? 'basic-room' : 'basic-yard', navigation: { bounds: { minX: -4.15, maxX: 4.15, minZ: -8, maxZ: 10 }, obstacles: [] } }; }
function cutscenes() {
  return [
    scene('morning', 'A message from Hale', 'lantern-common', [
      { kind: 'card', title: '17 November · Morning', text: 'Reed and Ellis leave through the front door and report to Commercial Street. Later, a message from Constable Hale brings them back to the Lantern.' },
      lanternShot('hale', 'Inspectors. The woman you met last night has been found dead. The doctor has attended; she has been taken to the mortuary.'),
      lanternShot('reed', 'We will need everyone’s account, and the things left where they were found.'),
    ]),
    scene('search-arranged', 'The search arranged', 'lantern-common', [
      lanternShot('hale', 'The report is with the inspector. I’ll take Arthur to Commercial Street and keep him there while you search his lodging.'),
      { kind: 'card', title: 'The upstairs room', text: 'Word has been sent to Bristol concerning Nora’s death. At Bell’s boot-repair shop, off Commercial Road, the landlord has admitted the officers to Arthur’s lodging.' },
    ]),
    scene('return-station', 'The evidence brought in', 'station-interview', [
      { kind: 'card', title: 'Commercial Street', text: 'The recovered objects are brought to the station. The questions belong to the investigators, and the answers to Arthur.' },
      shot('ellis', 'We have the case before us. Let him answer each part of it.', [-3.4, 3, 5.5], [.6, 1.7, 1]),
    ]),
    scene('return-lantern', 'Return to the Lantern', 'lantern-common', [
      { kind: 'card', title: 'The same evening', text: 'The report is complete. A police message has already been sent to Bristol. At the Lantern, Maggie has begun a personal letter to Nora’s sister.' },
      shot('reed', 'We should speak to Maggie.', [3.4, 2.7, 5.5], [-.6, 1.4, 1]),
    ]),
    scene('the-same-table', 'The same table', 'lantern-common', [
      { kind: 'card', title: 'The Lantern', text: 'The newspaper lies set aside. Maggie returns to the letter.' },
      { kind: 'shot', text: 'The common room carries on around the place where Nora worked.', camera: { position: [5.2, 5, 7], target: [0, .8, -1.8] }, actors: [{ id: 'maggie-closing', position: [0, 0, -3] }] },
    ]),
  ];
}
function scene(id, title, location, steps) { return { id, title, location, steps }; }
function lanternShot(speaker, text) {
  const staging = lanternBriefingStaging();
  return { kind: 'shot', speaker, text, ...staging, actors: [...staging.actors, { id: 'arthur-inn', position: [2.4, 0, -2.4], heading: -1 }] };
}
function shot(speaker, text, position, target, actors) { return { kind: 'shot', speaker, text, camera: { position, target }, ...(actors ? { actors } : {}) }; }
