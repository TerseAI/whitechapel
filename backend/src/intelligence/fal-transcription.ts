export interface AudioTranscription { transcribe(audio: Buffer, signal: AbortSignal): Promise<string> }
interface FalTranscriptionClient {
  run(endpoint: string, options: { input: { audio_url: string; language_code: string; diarize: boolean; tag_audio_events: boolean }; abortSignal: AbortSignal }): Promise<{ data: unknown }>;
}
export class TranscriptionError extends Error {}

export class FalTranscription implements AudioTranscription {
  constructor(private readonly client: FalTranscriptionClient) {}

  async transcribe(audio: Buffer, signal: AbortSignal): Promise<string> {
    try {
      const { data } = await this.client.run('fal-ai/elevenlabs/speech-to-text/scribe-v2', {
        input: { audio_url: `data:audio/wav;base64,${audio.toString('base64')}`, language_code: 'eng', diarize: false, tag_audio_events: false },
        abortSignal: signal,
      });
      if (!data || typeof data !== 'object' || !('text' in data) || typeof data.text !== 'string') throw new Error('Missing transcript');
      return data.text.trim();
    } catch (error) {
      signal.throwIfAborted();
      const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
      throw new TranscriptionError(status === 402 ? 'Speech recognition is unavailable because the fal account needs credits.'
        : status === 429 ? 'Speech recognition is busy. Wait a moment and try again.'
          : 'Speech recognition failed. Please try again.');
    }
  }
}
