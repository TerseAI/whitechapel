import type { FalClient } from '@fal-ai/client';
import { parseBuffer } from 'music-metadata';
import { generatedVoiceUrl } from '../../../shared/game/generated-voice.js';
import type { Delivery, Recording, SpeechProducer, SpeechProgress } from './types.js';

const endpoint = 'fal-ai/elevenlabs/tts/turbo-v2.5';

export class FalSpeech implements SpeechProducer {
  constructor(private readonly client: FalClient,
    private readonly voices: Record<string, string>,
    private readonly fetchAudio: typeof fetch = fetch) {}

  async synthesize(text: string, voice: string, delivery: Delivery, progress: SpeechProgress, save: () => Promise<void>): Promise<Recording> {
    if (progress.recording && generatedVoiceUrl(progress.recording.url)) return progress.recording;
    const input = { text, voice: this.voices[voice] ?? voice, stability: delivery === 'matter-of-fact' ? 1 : 0.5, language_code: 'en' };
    progress.recording = await this.generate(input, progress, save);
    await save();
    return progress.recording;
  }

  private async generate(input: { text: string; voice: string; stability: number; language_code: string }, progress: SpeechProgress, save: () => Promise<void>): Promise<Recording> {
    const signal = AbortSignal.timeout(35_000);
    if (!progress.requestId) {
      const submitted = await this.client.queue.submit(endpoint, { input, startTimeout: 20, abortSignal: signal });
      progress.requestId = submitted.request_id;
      await save();
    }
    await this.client.queue.subscribeToStatus(endpoint, { requestId: progress.requestId, abortSignal: signal, logs: false, mode: 'polling', pollInterval: 300 });
    const result = await this.client.queue.result(endpoint, { requestId: progress.requestId, abortSignal: signal });
    const data = result.data as { audio?: { url?: string } };
    const url = generatedVoiceUrl(data.audio?.url ?? '');
    if (!url) throw new Error('Unexpected speech file host.');
    const response = await this.fetchAudio(url, { signal, redirect: 'error' });
    if (!response.ok || Number(response.headers.get('content-length') ?? 0) > 15_000_000) throw new Error('Speech file unavailable.');
    const audio = Buffer.from(await response.arrayBuffer());
    if (audio.length > 15_000_000) throw new Error('Speech file exceeds the recording limit.');
    const metadata = await parseBuffer(audio, { mimeType: 'audio/mpeg', size: audio.length }, { duration: true });
    const duration = metadata.format.duration;
    if (!duration || !Number.isFinite(duration) || duration > 180) throw new Error('Invalid speech duration.');
    return { url, text: input.text, durationMs: Math.ceil(duration * 1000) };
  }
}
