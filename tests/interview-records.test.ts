import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeInterviewRecords, testimonyStatements } from '../backend/src/interviews/interview-records';
import type { NpcView, Reply } from '../shared/game/types';
import type { Character } from '../shared/story/types';
import { CharacterState } from '../backend/src/interviews/character-state';
import { canFollowUp, hasInterviewRecord, topicReply } from '../shared/game/interviews';
import fixture from './fixtures/framework/story.json';

test('chapter changes retain earlier interviews while updating a returning witness', () => {
  const earlier = witness('visitor', [reply('first', 'account', 'I did not move it.')]);
  const station = witness('station', [reply('second', 'station-account', 'I deny arranging anything.')]);
  const secondChapter = mergeInterviewRecords([earlier], [station]);
  const closing = mergeInterviewRecords(secondChapter, [witness('keeper', [])]);
  assert.deepEqual(closing.map(npc => npc.id), ['visitor', 'station', 'keeper']);
  assert.equal(closing[0].replies[0].text, 'I did not move it.');
  assert.equal(closing[1].replies[0].text, 'I deny arranging anything.');
  const returned = { ...earlier, trust: 3 };
  assert.deepEqual(mergeInterviewRecords(closing, [returned]).filter(npc => npc.id === 'visitor'), [returned]);
});

for (const answer of ['I deny arranging anything.', 'I arranged the discovery to mislead you.']) {
  test(`collected testimony retains its actual answer after the witness leaves: ${answer}`, () => {
    const account = reply('answer', 'station-account', answer);
    account.question = 'Will you correct your account of the yard?';
    account.turns = [{ speaker: 'witness', text: answer }, { speaker: 'investigator', text: 'Is that your answer?' }, { speaker: 'witness', text: 'Yes.' }];
    const retained = mergeInterviewRecords([witness('station', [account])], [witness('keeper', [])]);
    const statements = testimonyStatements('station-account', ['station-account'], retained, [{ id: 'inspector', name: 'Inspector One' }]);
    assert.equal(statements.length, 1);
    assert.equal(statements[0].witnessName, 'Witness station');
    assert.equal(statements[0].investigatorName, 'Inspector One');
    assert.equal(statements[0].question, account.question);
    assert.deepEqual(statements[0].turns, account.turns);
  });

  test(`saved character restoration preserves the evidence transcript: ${answer}`, () => {
    const definition = structuredClone(fixture.characters[0]) as Character;
    definition.topics[0].success = { text: answer, reward: 'account', turns: [{ speaker: 'witness', text: answer }, { speaker: 'investigator', text: 'Is that your answer?' }, { speaker: 'witness', text: 'Yes.' }] };
    const original = new CharacterState(definition, { now: () => 1000 });
    original.acquire('inspector');
    original.answer('inspector', 'saved-answer', 'record', 'reassure');
    original.release('inspector');
    const before = testimonyStatements('account', ['account'], [original.view()], [{ id: 'inspector', name: 'Inspector One' }]);
    const saved = JSON.parse(JSON.stringify({ collected: ['account'], records: [original.view()] })) as { collected: string[]; records: NpcView[] };
    const restored = new CharacterState(definition, { now: () => 9000 }, saved.records[0]);
    const closingRecords = mergeInterviewRecords(saved.records, [witness('keeper', [])]);
    assert.equal(restored.view().lease, null);
    assert.deepEqual(restored.view().replies, original.view().replies);
    assert.deepEqual(testimonyStatements('account', saved.collected, closingRecords, [{ id: 'inspector', name: 'Inspector One' }]), before);
    assert.deepEqual(testimonyStatements('account', [], closingRecords, []), []);
  });
}

test('evidence projection excludes uncollected, unrelated, unsuccessful and unrewarded exchanges', () => {
  const failed = { ...reply('failed', 'account', 'Unsuccessful private reply.'), success: false };
  const privateReply = { ...reply('private', 'account', 'Private follow-up.'), reward: undefined };
  const records = [witness('visitor', [reply('good', 'account', 'Recorded reply.'), reply('other', 'other-account', 'Another subject.'), failed, privateReply])];
  assert.deepEqual(testimonyStatements('account', [], records, []), []);
  const shown = testimonyStatements('account', ['account'], records, []);
  assert.deepEqual(shown.map(statement => statement.id), ['good']);
  assert.deepEqual(shown[0].turns, [{ speaker: 'witness', text: 'Recorded reply.' }]);
  assert.equal(shown[0].investigatorName, 'Investigator');
});

test('separate successful sources for the same collected record keep their attribution', () => {
  const first = witness('one', [reply('one-reply', 'shared-account', 'First source.')]);
  const second = witness('two', [reply('two-reply', 'shared-account', 'Second source.')]);
  const statements = testimonyStatements('shared-account', ['shared-account'], [first, second], []);
  assert.deepEqual(statements.map(statement => [statement.witnessName, statement.turns[0].text]), [['Witness one', 'First source.'], ['Witness two', 'Second source.']]);
});

test('repeated unsuccessful attempts cannot evict the successful source of collected evidence', () => {
  const character = structuredClone(fixture.characters[0]) as Character;
  character.topics.push({ id: 'followup', label: 'Follow-up', ask: 'Can you add anything?', claim: 'Ask a specific question.', observation: '', choices: [{ approach: 'reassure', label: 'Will you explain?' }, { approach: 'press', label: 'Will you guess?' }], correct: 'reassure', success: { text: 'A useful answer.' }, failure: { text: 'I will not guess.' } });
  const state = new CharacterState(character, { now: () => 1000 });
  state.acquire('inspector');
  state.answer('inspector', 'source', 'record', 'reassure');
  for (let index = 0; index < 85; index++) state.answer('inspector', `failed-${index}`, 'followup', 'press');
  assert.equal(state.view().replies.filter(reply => !reply.success).length, 80);
  assert.equal(state.view().replies.find(reply => reply.id === 'source')?.reward, 'account');
  assert.equal(testimonyStatements('account', ['account'], [state.view()], []).length, 1);
});

function witness(id: string, replies: Reply[]): NpcView {
  return { id, name: `Witness ${id}`, occupation: 'Witness', location: 'room', greeting: '', historical: '', trust: 2, lease: null, topics: [], replies };
}
function reply(id: string, reward: string, text: string): Reply {
  return { id, reward, text, npcId: 'visitor', topicId: 'account', playerId: 'inspector', success: true, approach: 'reassure', at: 1 };
}


test('a completed account includes earlier validated facts and additional rewards from the same speech', () => {
  const first = { ...reply('partial', '', 'The first fact.'), success: false, establishedFacts: { account: [0] } };
  const last = { ...reply('complete', 'other', 'The second fact.'), establishedFacts: { account: [1] }, disclosures: [{ knowledgeId: 'account', topicId: 'record', reward: 'account' }] };
  const records = [witness('visitor', [first, last])];
  assert.deepEqual(testimonyStatements('account', ['account'], records, []).map(item => item.id), ['partial', 'complete']);
  assert.deepEqual(testimonyStatements('account', [], records, []), []);
});

test('one validated response can complete and replay multiple required interview topics', () => {
  const statement = { ...reply('combined', 'account', 'Both accounts.'), disclosures: [{ knowledgeId: 'second-account', topicId: 'second', reward: 'second-account' }] };
  const npc = { ...witness('visitor', [statement]), requiredTopics: ['account', 'second'] };
  assert.equal(hasInterviewRecord(npc, []), true);
  assert.equal(topicReply(npc, 'second'), statement);
  assert.equal(canFollowUp(npc, 'second'), false);
});
