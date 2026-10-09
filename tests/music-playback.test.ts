import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MusicPlayback, type MusicAudio } from '../frontend/src/game/music-playback';

class FakeAudio implements MusicAudio {
  src = ''; loop = false; preload: MusicAudio['preload'] = ''; volume = 1; paused = true; currentTime = 0;
  plays = 0;
  rejectNext = false;
  async play() {
    this.plays++;
    if (this.rejectNext) { this.rejectNext = false; throw new Error('Autoplay blocked'); }
    this.paused = false;
  }
  pause() { this.paused = true; }
}

test('Authored music loops after a gesture without restarting during navigation', async () => {
  const audio = new FakeAudio(), music = new MusicPlayback(audio, '/story-assets/example/1/music.mp3');
  music.configure(true, .3, false);
  assert.equal(audio.plays, 0);
  music.unlock();
  await Promise.resolve();
  assert.equal(audio.src, '/story-assets/example/1/music.mp3');
  assert.equal(audio.loop, true);
  assert.equal(audio.paused, false);
  audio.currentTime = 45;
  music.configure(true, .3, false);
  assert.equal(audio.plays, 1);
  assert.equal(audio.currentTime, 45);
});

test('music ducks under speech and restores the chosen level', () => {
  const audio = new FakeAudio(), music = new MusicPlayback(audio, '/story-assets/example/1/music.mp3');
  music.configure(true, .4, true);
  assert.equal(audio.volume, .12);
  music.configure(true, .4, false);
  assert.equal(audio.volume, .4);
});

test('muting and hiding pause music without losing its position', async () => {
  const audio = new FakeAudio(), music = new MusicPlayback(audio, '/story-assets/example/1/music.mp3');
  music.configure(true, .3, false); music.unlock();
  await Promise.resolve(); await Promise.resolve();
  audio.currentTime = 80;
  music.configure(true, 0, false);
  assert.equal(audio.paused, true);
  music.configure(true, .3, false);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(audio.paused, false);
  assert.equal(audio.currentTime, 80);
  music.configure(false, .3, false);
  assert.equal(audio.paused, true);
});

test('a rejected autoplay attempt can recover on the next gesture', async () => {
  const audio = new FakeAudio(), music = new MusicPlayback(audio, '/story-assets/example/1/music.mp3');
  audio.rejectNext = true;
  music.configure(true, .3, false); music.unlock();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(audio.paused, true);
  music.unlock();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(audio.paused, false);
});

test('disposing prevents an outstanding play request from leaving music running', async () => {
  const audio = new FakeAudio();
  let finish!: () => void;
  audio.play = () => new Promise<void>(resolve => { finish = () => { audio.paused = false; resolve(); }; });
  const music = new MusicPlayback(audio, '/story-assets/example/1/music.mp3');
  music.configure(true, .3, false); music.unlock(); music.dispose(); finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(audio.paused, true);
});
