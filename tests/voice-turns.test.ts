import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VoiceTurns, type DetectorEvents, type SpeechDetector, type VoiceMode, type VoiceState } from '../frontend/src/interviews/voice-turns';

test('hands-free speech is sent as soon as the player stops talking', async () => {
  const f = setup({ transcripts: [' Where were you last night? '] });
  await f.start();
  assert.equal(f.state().status, 'listening');
  f.detector.speak();
  assert.equal(f.state().status, 'hearing');
  f.detector.stop(); await flush();
  assert.deepEqual(f.delivered, ['Where were you last night?']);
  assert.equal(f.recordings[0].type, 'audio/wav');
  assert.equal(f.state().status, 'listening');
});

test('listening pauses while the witness replies and resumes without reopening the microphone', async () => {
  const f = setup({ transcripts: ['One.', 'Two.'] });
  await f.start();
  f.detector.speak(); f.detector.stop(); await flush();
  f.voice.setAvailable(false); await flush();
  assert.equal(f.detector.listening, false);
  f.detector.speak(); f.detector.stop(); await flush();
  assert.deepEqual(f.delivered, ['One.']);
  f.voice.setAvailable(true); await flush();
  f.detector.speak(); f.detector.stop(); await flush();
  assert.deepEqual(f.delivered, ['One.', 'Two.']);
  assert.equal(f.detector.calls.filter(call => call === 'open').length, 1);
  await f.voice.close();
  assert.equal(f.detector.calls.at(-1), 'close');
});

test('hold to talk listens only while held and sends on release', async () => {
  const f = setup({ mode: 'hold', transcripts: ['I have a question.'] });
  await f.start();
  assert.equal(f.state().status, 'waiting');
  await f.voice.press();
  assert.equal(f.state().status, 'listening');
  f.detector.speak();
  await f.voice.release(); await flush();
  assert.deepEqual(f.delivered, ['I have a question.']);
  await f.voice.press(); await f.voice.release();
  assert.match(f.state().error, /Nothing was heard/);
  assert.equal(f.detector.listening, false);
});

test('switching to hold to talk stops hands-free listening', async () => {
  const f = setup();
  await f.start();
  await f.voice.setMode('hold');
  assert.equal(f.detector.listening, false);
  assert.equal(f.detector.mode, 'hold');
  assert.equal(f.state().mode, 'hold');
});

test('a false start in hands-free mode resumes listening without an error', async () => {
  const f = setup({ transcripts: [''] });
  await f.start();
  f.detector.speak(); f.detector.stop(); await flush();
  assert.deepEqual(f.delivered, []);
  assert.equal(f.state().error, '');
  assert.equal(f.state().status, 'listening');
});

test('transcription failures are reported and listening resumes', async () => {
  const f = setup({ failure: new Error('Speech recognition is unavailable because the fal account needs credits.') });
  await f.start();
  f.detector.speak(); f.detector.stop(); await flush();
  assert.match(f.state().error, /fal.*credits/);
  assert.equal(f.state().status, 'listening');
});

test('overlong speech asks for a shorter message without uploading it', async () => {
  const f = setup();
  await f.start();
  f.detector.speak(); f.detector.stop(seconds(31)); await flush();
  assert.equal(f.recordings.length, 0);
  assert.match(f.state().error, /shorter message/);
});

test('denied microphone access explains how to allow it', async () => {
  const f = setup({ openError: new DOMException('Permission denied', 'NotAllowedError') });
  await f.start();
  assert.equal(f.state().status, 'off');
  assert.match(f.state().error, /Allow the microphone/);
});

test('a browser without microphone support says where the game can hear the player', async () => {
  const f = setup({ openError: new DOMException('No audio worklets', 'NotSupportedError') });
  await f.start();
  assert.match(f.state().error, /Chrome or Safari on localhost or HTTPS/);
});

test('cancelling or closing discards a pending transcription', async () => {
  const f = setup({ pending: true });
  await f.start();
  f.detector.speak(); f.detector.stop(); await flush();
  assert.equal(f.state().status, 'transcribing');
  await f.voice.cancel(); await flush();
  assert.equal(f.state().status, 'listening');
  f.detector.speak(); f.detector.stop(); await flush();
  await f.voice.close(); await flush();
  assert.deepEqual(f.delivered, []);
  assert.equal(f.state().status, 'off');
});

function setup({ mode = 'hands-free' as VoiceMode, transcripts = ['Hello.'], failure = undefined as Error | undefined, openError = undefined as Error | undefined, pending = false } = {}) {
  const detector = fakeDetector(openError);
  const recordings: Blob[] = [], delivered: string[] = [];
  let state: VoiceState | undefined;
  const transcribe = async (audio: Blob, signal: AbortSignal) => {
    recordings.push(audio);
    if (pending) return new Promise<string>((_, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
    if (failure) throw failure;
    return transcripts.shift() ?? '';
  };
  const voice = new VoiceTurns(detector.open, transcribe, async text => { delivered.push(text); }, next => { state = next; }, mode);
  const start = async () => { await voice.enable(); voice.setAvailable(true); await flush(); };
  return { voice, detector, recordings, delivered, start, state: () => state! };
}

function fakeDetector(openError?: Error) {
  const calls: string[] = [];
  let events: DetectorEvents | undefined, speech: Float32Array | null = null;
  const fake = {
    calls, listening: false, mode: 'hands-free' as VoiceMode,
    speak() { speech = seconds(1); events!.speechStarted(); },
    stop(audio = speech ?? seconds(1)) { speech = null; events!.speechEnded(audio); },
    async open(received: DetectorEvents): Promise<SpeechDetector> {
      calls.push('open');
      if (openError) throw openError;
      events = received;
      return detector;
    },
  };
  const detector: SpeechDetector = {
    async listen() { calls.push('listen'); fake.listening = true; },
    async pause() {
      if (!fake.listening) return;
      fake.listening = false; calls.push('pause');
      const held = fake.mode === 'hold' ? speech : null;
      speech = null;
      if (held) events!.speechEnded(held);
    },
    setMode(mode) { fake.mode = mode; },
    async close() { calls.push('close'); },
  };
  return fake;
}

function seconds(duration: number) { return new Float32Array(16000 * duration).fill(0.1); }
function flush() { return new Promise(resolve => setImmediate(resolve)); }
