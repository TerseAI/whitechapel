import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CharacterState } from '../backend/src/interviews/character-state';
import { canFollowUp, topicAvailable } from '../shared/game/interviews';
import type { Character } from '../shared/story/types';
import fixture from './fixtures/framework/story.json';

for (const endsInterview of [false, true]) {
  test(`terminal reply ${endsInterview} controls further questioning and survives restoration`, () => {
    const definition = structuredClone(fixture.characters[0]) as Character;
    definition.topics[0].success = { text: 'My answer.', endsInterview };
    const state = new CharacterState(definition, { now: () => 1000 });
    state.acquire('one');
    const result = state.answer('one', 'answer', 'record', 'reassure');
    assert.equal(result.reply?.endsInterview, endsInterview);
    const view = state.view();
    assert.equal(topicAvailable(definition.topics[0], view, []), !endsInterview);
    assert.equal(canFollowUp(view, 'another'), !endsInterview);
    assert.equal(state.answer('one', 'new-request', 'record', 'reassure').ok, !endsInterview);
    assert.equal(state.answer('one', 'answer', 'record', 'reassure').reply?.id, 'answer');
    const restored = new CharacterState(definition, { now: () => 2000 }, JSON.parse(JSON.stringify(view)));
    restored.release('one');
    assert.equal(restored.acquire('two').ok, !endsInterview);
    assert.equal(restored.view().replies.length, 1);
  });
}
