import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createActorStub } from 'terse-sdk/actors';
import { caseActorId, caseIdFromActorId, entityActorId } from '../backend/src/actors/entity-identity';

test('actor addresses identify the story entity and remain isolated between cases', () => {
  assert.match(entityActorId('case-one', 'baines'), /^baines--[a-f0-9]{64}$/);
  assert.match(entityActorId('case-one', 'lantern-common'), /^lantern-common--[a-f0-9]{64}$/);
  assert.equal(entityActorId('case-one', 'baines'), entityActorId('case-one', 'baines'));
  assert.notEqual(entityActorId('case-one', 'baines'), entityActorId('case-two', 'baines'));
  assert.notEqual(entityActorId('a', 'b-c'), entityActorId('a-b', 'c'));
});

test('case addresses preserve invitation IDs in the current save namespace', () => {
  assert.equal(caseActorId('18d39f4e11f56c317b207801'), 'case--v5--18d39f4e11f56c317b207801');
  assert.equal(caseIdFromActorId(caseActorId('18d39f4e11f56c317b207801')), '18d39f4e11f56c317b207801');
  assert.throws(() => caseIdFromActorId('18d39f4e11f56c317b207801'), /case actor/i);
  assert.throws(() => caseIdFromActorId('case--18d39f4e11f56c317b207801'), /case actor/i);
  assert.throws(() => caseIdFromActorId('case--v5--'), /case actor/i);
});

test('readable addresses use characters accepted by the installed actor client', () => {
  for (const id of [caseActorId('case-one'), entityActorId('case-one', 'lantern-common')]) {
    assert.doesNotThrow(() => createActorStub('ExampleActor', id, []));
  }
  assert.throws(() => createActorStub('ExampleActor', 'baines~id', []), /actor ID/);
});
