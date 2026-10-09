import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CharacterState } from '../../../backend/src/interviews/character-state';
import { examineObject } from '../../../backend/src/cases/object-inspection';
import { topicAvailable } from '../../../shared/game/interviews';
import { objectPlacement } from '../../../shared/game/physical-objects';
import { cluePosition } from '../../../shared/game/navigation';
import { stageReady } from '../../../shared/game/progression';
import { gateOpen } from '../../../shared/game/story-gates';
import type { Approach } from '../../../shared/game/types';
import type { StoryDefinition } from '../../../shared/story/types';

const story = JSON.parse(readFileSync(new URL('../story.json', import.meta.url), 'utf8')) as StoryDefinition;

for (const discovery of ['objects-first', 'witnesses-first'] as const) {
  for (const ending of ['denial', 'partial', 'recovered-partial'] as const) {
    test(`${discovery} reaches the fixed solution with ${ending}`, () => {
      const play = new Investigation();
      play.arrive();
      play.enquire(discovery);
      play.search();
      play.confront(ending);
      play.close();
      assert.equal(play.chapter, 4);
      assert.equal(play.ready(), true);
    });
  }
}

test('wrong exhibits preserve progress, and a successful reply replays without changing the account', () => {
  const play = new Investigation();
  play.arrive();
  play.enquire('witnesses-first');
  play.search();
  const before = [...play.found];
  const failed = play.ask('arthur-station', 'relationship', 'challenge', 'inn-newspaper', false);
  assert.equal(failed.success, false);
  assert.match(failed.text, /photograph/);
  assert.deepEqual(play.found, before);
  const answered = play.ask('arthur-station', 'relationship', 'challenge', 'complete-wedding');
  assert.equal(answered.reward, 'station-relationship');
  const replay = play.ask('arthur-station', 'relationship', 'reassure');
  assert.equal(replay.id, answered.id);
  assert.deepEqual(replay.turns, answered.turns);
});

test('Maggie can disclose the marriage and complete print without the torn photo or surname puzzle', () => {
  const play = new Investigation();
  play.arrive();
  play.ask('baines', 'friend');
  play.ask('maggie', 'privacy', 'reassure');
  play.ask('maggie', 'photograph');
  assert.equal(play.available('maggie', 'separation'), true);
  play.ask('arthur-inn', 'relationship', 'reassure');
  play.connect('concealed-marriage');
  assert.equal(play.found.includes('torn-wedding'), false);
  assert.equal(play.found.includes('travel-papers'), false);
  assert.equal(play.found.includes('finch-work-card'), false);
});

for (const route of ['name', 'photograph', 'marriage', 'brother']) {
  test(`Maggie’s ${route} route establishes the marriage without repeating the question`, () => {
    const play = new Investigation();
    play.arrive();
    play.ask('baines', 'friend');
    play.ask('maggie', 'privacy', 'challenge', undefined, false);
    play.ask('maggie', 'privacy', 'press');
    if (route === 'name') play.collect('travel-papers');
    if (route === 'brother') play.ask('arthur-inn', 'relationship');
    play.ask('maggie', route);
    assert.equal(play.available('maggie', 'separation'), true);
    play.ask('maggie', 'separation');
    assert.equal(play.decisions['marriage-identified'], 'confirmed');
  });
}

test('suspecting George still obtains his access account and preserves later enquiries', () => {
  const play = new Investigation();
  play.arrive();
  play.ask('george', 'arrival');
  play.inspect('cart-candlestick');
  const response = play.ask('george', 'candlestick', 'press');
  assert.equal(response.reward, 'george-candlestick');
  assert.match(response.text, /Anyone/);
  assert.equal(play.available('george', 'night'), true);
});

test('George’s candlestick follow-up requires his discovery account and the recovered object', () => {
  const play = new Investigation();
  play.arrive();
  assert.equal(play.available('george', 'arrival'), true);
  assert.equal(play.available('george', 'candlestick'), false);
  play.ask('george', 'arrival', 'reassure');
  assert.equal(play.available('george', 'candlestick'), false);
  play.ask('hale', 'privacy');
  play.inspect('cart-candlestick');
  assert.equal(play.available('george', 'candlestick'), true);
  play.ask('george', 'candlestick', 'reassure');
  assert.ok(play.found.includes('george-candlestick'));
});

test('finding the candlestick first does not skip George’s discovery account', () => {
  const play = new Investigation();
  play.arrive();
  play.ask('hale', 'privacy');
  play.inspect('cart-candlestick');
  assert.equal(play.available('george', 'candlestick'), false);
  play.ask('george', 'arrival', 'reassure');
  play.ask('george', 'candlestick', 'reassure');
  play.ask('baines', 'visitor', 'reassure');
  assert.equal(play.available('baines', 'disturbance'), false);
  play.inspect('trunk');
  play.inspect('room-disturbance');
  play.inspect('service-route');
  play.ask('hale', 'discovery');
  play.ask('baines', 'blanket', 'reassure');
  play.connect('room-to-yard');
  play.ask('baines', 'disturbance', 'press', undefined, false);
  play.reassureBaines();
  assert.ok(play.found.includes('george-candlestick'));
  assert.ok(play.found.includes('baines-disturbance'));
  assert.equal(play.found.includes('killing-admitted'), false);
});

class Investigation {
  chapter = 0;
  found: string[] = [];
  deductions: string[] = [];
  decisions: Record<string, string> = {};
  inspections: Record<string, string[]> = {};
  private request = 0;
  private characters = new Map(story.characters.map(npc => [npc.id, new CharacterState(npc, { now: () => 1000 })]));

  arrive() {
    this.ask('george-arrival', 'collection', 'reassure');
    this.ask('baines-arrival', 'rooms', 'reassure');
    this.ask('nora', 'work', 'reassure');
    this.ask('nora', 'journey', 'reassure');
    this.advance();
    this.ask('hale', 'privacy');
  }

  enquire(route: 'objects-first' | 'witnesses-first') {
    if (route === 'objects-first') {
      this.inspectRoomAndYard();
      this.inspect('work-correspondence');
    } else this.ask('baines', 'friend');
    this.ask('baines', 'visitor', 'reassure');
    this.ask('arthur-inn', 'relationship', 'reassure');
    this.ask('arthur-inn', 'visit', 'reassure');
    this.ask('arthur-inn', 'trunk', 'reassure');
    this.ask('maggie', 'privacy', 'reassure');
    this.ask('maggie', 'photograph');
    this.ask('maggie', 'marriage', 'reassure');
    this.ask('maggie', 'separation', 'reassure');
    this.ask('hale', 'discovery');
    this.ask('hale', 'knife');
    this.ask('alden', 'findings');
    this.ask('hale', 'address');
    this.ask('george', 'arrival', 'reassure');
    this.ask('george', 'night', 'reassure');
    if (route === 'witnesses-first') this.inspectRoomAndYard();
    this.ask('baines', 'blanket', 'reassure');
    this.ask('baines', 'identify-candle', 'challenge', 'cart-candlestick');
    this.ask('baines', 'cart');
    this.connect('room-to-yard');
    this.reassureBaines(route === 'objects-first');
    this.ask('arthur-inn', 'trunk-followup', route === 'objects-first' ? 'challenge' : 'reassure', route === 'objects-first' ? 'baines-trunk' : undefined);
    for (const id of story.chapters[1].deductionIds) this.connect(id);
    this.advance();
  }

  reassureBaines(useEvidence = false) {
    assert.equal(this.available('baines', 'sounds'), false);
    this.ask('baines', 'disturbance', useEvidence ? 'challenge' : 'reassure', useEvidence ? 'trunk-interior' : undefined);
    assert.equal(this.found.includes('baines-disturbance'), false);
    assert.equal(this.available('baines', 'safety'), false);
    assert.equal(this.available('baines', 'trunk'), false);
    this.ask('hale', 'protection');
    assert.equal(this.available('baines', 'sounds'), false);
    this.ask('baines', 'safety');
    this.ask('baines', 'sounds');
    this.ask('baines', 'trunk');
    this.ask('baines', 'hiding');
    assert.ok(this.found.includes('baines-hiding'));
  }

  search() {
    this.inspect('hearth-remains', false);
    assert.equal(this.found.includes('burned-report'), false, 'the fragile newspaper requires both detectives');
    this.inspect('hearth-remains');
    this.collect('inn-newspaper');
    for (const id of story.chapters[2].deductionIds) this.connect(id);
    this.advance();
  }

  confront(route: 'denial' | 'partial' | 'recovered-partial') {
    const trunk = this.decisions['inn-trunk-account'] === 'helping' ? 'trunk-helping' : 'trunk-disputing';
    for (const id of ['fire', trunk, 'relationship']) assert.equal(this.available('arthur-station', id), true);
    const opening = route === 'denial' ? ['fire', trunk, 'relationship'] : ['relationship', trunk, 'fire'];
    for (const id of opening) this.ask('arthur-station', id, id === 'relationship' ? 'challenge' : 'reassure', id === 'relationship' ? 'complete-wedding' : undefined);
    this.ask('arthur-station', 'finding-nora');
    this.ask('arthur-station', 'departure', 'reassure');
    this.ask('arthur-station', 'room', 'reassure');
    const slip = this.ask('arthur-station', 'candlestick', 'reassure');
    assert.equal(slip.reward, 'arthur-candlestick-slip');
    assert.equal(this.available('arthur-station', 'source'), false);
    this.connect('unshared-detail');
    this.ask('arthur-station', 'source', 'reassure');
    assert.equal(this.available('arthur-station', 'source-rebuttal'), false);
    this.ask('hale-station', 'disclosure');
    this.connect('source-excuse');
    this.ask('arthur-station', 'source-rebuttal', route === 'denial' ? 'press' : 'challenge', route === 'denial' ? undefined : 'cart-candlestick');
    this.ask('arthur-station', 'cause', 'challenge', 'medical-findings');
    this.ask('arthur-station', 'yard', 'reassure');
    assert.equal(this.ready(), true, 'the checked slip supports a report without a further admission');
    assert.equal(this.found.includes('disguise-admitted'), false);
    if (route !== 'denial') {
      if (route === 'recovered-partial') this.ask('arthur-station', 'room-revisit', 'press', undefined, false);
      this.ask('arthur-station', 'room-revisit', 'challenge', 'room-disturbance');
      const failed = this.ask('arthur-station', 'purpose', 'press', undefined, false);
      assert.equal(failed.reward, undefined);
      assert.equal(this.available('arthur-station', 'disguise'), false);
      this.ask('arthur-station', 'purpose', 'challenge', 'trunk-interior');
      const final = this.ask('arthur-station', 'disguise', 'challenge', 'inn-newspaper');
      assert.equal(final.reward, 'disguise-admitted');
      assert.equal(final.endsInterview, true);
      assert.equal(final.turns?.at(-1)?.text, 'I didn’t kill her.');
      const npc = this.characters.get('arthur-station')!.view();
      assert.ok(npc.topics.every(topic => !this.available(npc.id, topic.id)));
      assert.equal(this.ready(), true);
    }
    assert.equal(this.found.includes('killing-admitted'), false);
    this.advance();
  }

  close() { this.ask('maggie-closing', 'sister', 'reassure'); }

  ask(id: string, topicId: string, approach: Approach = 'reassure', evidenceId?: string, success = true) {
    const character = this.characters.get(id)!;
    assert.ok(story.chapters[this.chapter].npcIds.includes(id), `${id} active in stage ${this.chapter}`);
    const place = story.chapters[this.chapter].locations.find(place => place.id === character.view().location)!;
    assert.equal(gateOpen(place, this.facts()), true, `${id} location is available`);
    assert.equal(this.available(id, topicId), true, `${id}/${topicId} available`);
    if (evidenceId) assert.ok(this.found.includes(evidenceId), `proof ${evidenceId} was collected`);
    character.acquire('reed-player');
    const result = character.answer('reed-player', `reply-${++this.request}`, topicId, approach, evidenceId);
    assert.ok(result.reply);
    assert.equal(result.reply.success, success, `${id}/${topicId}/${approach}`);
    if (result.reply.reward && !this.found.includes(result.reply.reward)) this.found.push(result.reply.reward);
    if (result.reply.choice) this.decisions[result.reply.choice.id] = result.reply.choice.value;
    character.release('reed-player');
    return result.reply;
  }

  available(id: string, topicId: string) {
    const npc = this.characters.get(id)!.view();
    return topicAvailable(npc.topics.find(topic => topic.id === topicId)!, npc, this.found, this.facts());
  }

  inspect(id: string, together = true) {
    const object = story.objects[id];
    const places = story.chapters[this.chapter].locations;
    const placement = objectPlacement(object, this.chapter, places);
    assert.ok(placement, `${id} remains placed in stage ${this.chapter}`);
    const { place, index } = placement;
    assert.equal(gateOpen(place, this.facts()), true);
    const position = cluePosition(index, place.indoor, place.navigation, place.hotspots[index].id);
    for (const step of object.steps) {
      const result = examineObject({ chapter: this.chapter, places, player: { location: place.id, position }, inspections: this.inspections, found: this.found, deductions: this.deductions, members: [{ location: place.id }, { location: together ? place.id : 'lantern-common' }] }, id, step.id, story.objects);
      if (step.togetherAt && !together) { assert.equal(result.ok, false); continue; }
      assert.equal(result.ok, true, `${id}/${step.id}: ${result.message}`);
      if (result.ok) {
        this.inspections[id] = result.observed;
        this.found.push(...result.evidenceIds);
      }
    }
  }

  collect(id: string) {
    const place = story.chapters[this.chapter].locations.find(place => place.hotspots.some(hotspot => hotspot.id === id));
    assert.ok(place, `${id} has a hotspot`);
    assert.equal(story.clues[id].kind, 'object');
    assert.ok(story.chapters[this.chapter].clueIds.includes(id));
    assert.equal(gateOpen(place, this.facts()), true);
    if (!this.found.includes(id)) this.found.push(id);
  }

  connect(id: string) {
    const deduction = story.deductions.find(deduction => deduction.id === id)!;
    assert.ok(story.chapters[this.chapter].deductionIds.includes(id));
    assert.ok(deduction.requires.every(evidence => this.found.includes(evidence)), `${id} evidence was collected`);
    assert.equal(gateOpen(deduction, this.facts()), true, `${id} contextual requirements`);
    this.deductions.push(id);
  }

  ready() { const chapter = story.chapters[this.chapter]; return stageReady(chapter.requiredEvidence, chapter.deductionIds, this.found, this.deductions); }
  private advance() { assert.equal(this.ready(), true, `stage ${this.chapter} is ready`); this.chapter++; }
  private facts() { return { evidence: this.found, deductions: this.deductions, decisions: this.decisions }; }
  private inspectRoomAndYard() { for (const id of ['trunk', 'cart-candlestick', 'room-disturbance', 'service-route']) this.inspect(id); this.collect('travel-papers'); }
}
