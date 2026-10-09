import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConversationPlayback, type ConversationCue } from '../frontend/src/interviews/conversation-playback';
import type { InterviewSpeech } from '../shared/game/types';

class Audio extends EventTarget {
  src = ''; currentTime = 0; volume = 1; calls = 0;
  resolve: (() => void) | undefined;
  play() { this.calls++; return new Promise<void>(resolve => { this.resolve = resolve; }); }
  pause() {}
}
const speech: InterviewSpeech = {
  id: 'exchange', playerId: 'one', npcId: 'witness', location: 'court', chapter: 0, at: 0, endsAt: 4,
  lines: ['Question', 'Answer', 'Follow-up', 'Clarification'].map((text, index) => ({ clip: String(index), text, speakerId: index % 2 ? 'witness' : 'one', speakerName: index % 2 ? 'Witness' : 'Alice', durationMs: 1 })),
};
function setup(recorded = true, mutedMode: 'reading' | 'playing' = 'playing') {
  const audio = new Audio();
  let cue: ConversationCue | null = null;
  const playback = new ConversationPlayback(audio, clip => recorded ? clip : null, next => { cue = next; }, mutedMode);
  return { audio, playback, current: () => cue };
}

test('only the current turn is revealed when it starts; choices wait for the final recording to end', () => {
  const { audio, playback, current } = setup();
  playback.follow(speech, 1);
  assert.equal(current()?.revealed, false);
  assert.equal(current()?.status, 'loading');
  for (let index = 0; index < 4; index++) {
    assert.equal(current()?.index, index);
    audio.dispatchEvent(new Event('playing'));
    assert.equal(current()?.revealed, true);
    assert.equal(current()?.line.text, speech.lines[index].text);
    assert.equal(current()?.status, 'playing');
    audio.dispatchEvent(new Event('ended'));
  }
  assert.equal(current()?.status, 'complete');
  assert.equal(audio.calls, 4);
});

test('buffering and repeated server snapshots cannot skip a turn or expose later dialogue', async () => {
  const { audio, playback, current } = setup();
  playback.follow(speech, .5);
  audio.dispatchEvent(new Event('playing'));
  audio.currentTime = .8;
  audio.dispatchEvent(new Event('waiting'));
  await new Promise(resolve => setTimeout(resolve, 15));
  playback.follow(speech, .7);
  assert.equal(current()?.index, 0);
  assert.equal(current()?.revealed, true);
  assert.equal(current()?.status, 'loading');
  assert.equal(audio.currentTime, .8);
  assert.equal(audio.calls, 1);
  assert.equal(audio.volume, .7);
});

test('missing recordings use Continue without showing the whole exchange', () => {
  for (const volume of [0, 1]) {
    const { audio, playback, current } = setup(false);
    playback.follow(speech, volume);
    assert.equal(current()?.status, 'reading');
    assert.equal(current()?.line.text, 'Question');
    assert.equal(audio.calls, 0);
    for (let index = 1; index < 4; index++) {
      playback.advance();
      assert.equal(current()?.index, index);
      assert.equal(current()?.status, 'reading');
    }
    playback.advance();
    assert.equal(current()?.status, 'complete');
  }
});

test('muted interviews follow the recordings through every subtitle without Continue', () => {
  const { audio, playback, current } = setup();
  playback.follow(speech, 0);
  assert.equal(audio.volume, 0);
  for (let index = 0; index < speech.lines.length; index++) {
    audio.dispatchEvent(new Event('playing'));
    assert.equal(current()?.index, index);
    assert.equal(current()?.status, 'playing');
    assert.equal(current()?.revealed, true);
    audio.dispatchEvent(new Event('ended'));
  }
  assert.equal(current()?.status, 'complete');
  assert.equal(audio.calls, speech.lines.length);
});

test('muting and unmuting an interview preserve playback position and automatic advancement', () => {
  const { audio, playback, current } = setup();
  playback.follow(speech, 1);
  audio.dispatchEvent(new Event('playing'));
  audio.currentTime = .75;
  playback.setVolume(0);
  assert.equal(current()?.status, 'playing');
  assert.equal(current()?.index, 0);
  assert.equal(audio.currentTime, .75);
  playback.setVolume(1);
  assert.equal(audio.currentTime, .75);
  assert.equal(audio.calls, 1);
  audio.dispatchEvent(new Event('ended'));
  assert.equal(current()?.line.text, 'Answer');
});

test('cutscenes retain manual reading when muted', () => {
  const audio = new Audio();
  const cues: ConversationCue[] = [];
  const playback = new ConversationPlayback(audio, clip => clip, cue => { if (cue) cues.push(cue); });
  playback.follow(speech, 0);
  assert.equal(cues.at(-1)?.status, 'reading');
  assert.equal(audio.calls, 0);
});

test('a failed recording falls back to reading and stale callbacks cannot revive a closed conversation', async () => {
  const { audio, playback, current } = setup();
  playback.follow(speech, 1);
  const resolve = audio.resolve;
  audio.dispatchEvent(new Event('error'));
  assert.equal(current()?.status, 'reading');
  playback.stop();
  resolve?.();
  audio.dispatchEvent(new Event('ended'));
  await Promise.resolve();
  assert.equal(current(), null);
});

test('effect recreation resumes the current turn at its playback position', () => {
  const { audio, playback, current } = setup();
  playback.follow(speech, 1);
  audio.dispatchEvent(new Event('ended'));
  audio.dispatchEvent(new Event('playing'));
  audio.currentTime = .75;
  const resume = playback.suspend();
  audio.dispatchEvent(new Event('ended'));
  assert.equal(current()?.index, 1);
  resume();
  assert.equal(audio.currentTime, .75);
  assert.equal(current()?.index, 1);
  audio.dispatchEvent(new Event('playing'));
  assert.equal(current()?.line.text, 'Answer');
  audio.dispatchEvent(new Event('ended'));
  assert.equal(current()?.index, 2);
});

test('effect recreation preserves reading and completion, and cannot revive a stopped exchange', () => {
  const { audio, playback, current } = setup(true, 'reading');
  playback.follow(speech, 0);
  playback.suspend()();
  assert.equal(current()?.status, 'reading');
  assert.equal(audio.calls, 0);
  for (const _ of speech.lines) playback.advance();
  playback.suspend()();
  assert.equal(current()?.status, 'complete');
  playback.follow({ ...speech, id: 'next-exchange' }, 1);
  const resume = playback.suspend();
  playback.stop();
  resume();
  assert.equal(current(), null);
  assert.equal(audio.calls, 1);
});
