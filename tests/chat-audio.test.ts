import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpeechPlayback, type SpeechCue } from '../frontend/src/game/speech-playback';
import { canFollowUp } from '../shared/game/interviews';

import type { InterviewSpeech, Reply } from '../shared/game/types';

class FakeAudio extends EventTarget {
  src = ''; currentTime = 0; calls = 0; volume = 1;
  reject: Error | undefined;
  play() { this.calls++; return this.reject ? Promise.reject(this.reject) : Promise.resolve(); }
  pause() {}
}
const speech: InterviewSpeech = { id: 's', npcId: 'witness', playerId: 'a', location: 'court', chapter: 0, at: 100,
 endsAt: 10000, lines: [{ clip: 'question', speakerId: 'a', speakerName: 'Alice', text: 'Why did you stop?', durationMs: 2000 }, { clip: 'answer', speakerId: 'witness', speakerName: 'Witness', text: 'I saw her.', durationMs: 2000 }] };
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
test('volume changes apply immediately without restarting the current line and follow the next interview', () => {
 const audio = new FakeAudio();
 const playback = new SpeechPlayback(audio, id => id, () => {}, () => {});
 try {
  playback.follow(speech, () => 100, .35);
  assert.equal(audio.volume, .35);
  audio.currentTime = .8;
  playback.follow(speech, () => 100, .65);
  assert.equal(audio.volume, .65);
  assert.equal(audio.currentTime, .8);
  assert.equal(audio.calls, 1);
  playback.follow({ ...speech, id: 'partner', playerId: 'b' }, () => 100, .2);
  assert.equal(audio.volume, .2);
 } finally { playback.stop(); }
});
test('playing indicator follows actual playback and distinguishes loading, buffering and blocked audio', async () => {
 const audio = new FakeAudio(); const cues: SpeechCue[] = [];
 const p = new SpeechPlayback(audio, id => id, cue => { if(cue)cues.push(cue); }, () => {});
 p.follow(speech, () => 100); assert.equal(cues.at(-1)?.status, 'loading');
 await flush(); assert.equal(cues.at(-1)?.status, 'playing');
 audio.dispatchEvent(new Event('waiting')); assert.equal(cues.at(-1)?.status, 'loading');
 audio.currentTime = 1; audio.dispatchEvent(new Event('playing')); assert.equal(cues.at(-1)?.progress, .5);
 p.stop(); audio.reject = Object.assign(new Error('gesture needed'), { name: 'NotAllowedError' });
 p.follow({ ...speech, id: 'blocked' }, () => 100); await flush(); assert.equal(cues.at(-1)?.status, 'blocked'); p.stop();
});
test('missing audio never displays speaking or makes a failing media request', () => {
 const audio = new FakeAudio(); let cue: SpeechCue | null = null;
 const p = new SpeechPlayback(audio, () => null, c => { cue = c; }, () => {});
 p.follow(speech, () => 100); assert.equal((cue as SpeechCue | null)?.status, 'missing'); assert.equal(audio.calls, 0); p.stop();
});
test('late listeners seek into the right voice; stopped playback cannot set a stale speaking state', async () => {
 const audio = new FakeAudio(); const cues: SpeechCue[] = [];
 const p = new SpeechPlayback(audio, id => id, c => { if(c)cues.push(c); }, () => {});
 p.follow(speech, () => 2500); audio.dispatchEvent(new Event('loadedmetadata'));
 assert.equal(audio.src, 'answer'); assert.equal(audio.currentTime, .22);
 p.stop(); const count=cues.length; await flush(); assert.equal(cues.length, count);
});
const reply = (success: boolean): Reply => ({ id: 'answer', npcId: 'witness', topicId: 'record', playerId: 'a', approach: 'press', at: 1, success, text: 'Recorded.' });
test('authored one-attempt interviews stay committed while recoverable interviews allow follow-ups', () => {
 assert.equal(canFollowUp({id:'witness',repeatable:false,replies:[reply(false)]},'record'),false);
 assert.equal(canFollowUp({id:'witness',repeatable:true,replies:[reply(false)]},'record'),true);
 assert.equal(canFollowUp({id:'witness',repeatable:true,replies:[reply(true)]},'record'),false);
});
