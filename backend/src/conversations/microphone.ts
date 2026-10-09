import { parseBuffer } from 'music-metadata';
import type { ConversationIdentity } from '../../../shared/game/conversation-socket.js';
import { speechRecording } from '../../../shared/game/speech-recording.js';
import type { ActionResult } from '../../../shared/game/types.js';
import { TranscriptionError, type AudioTranscription } from '../intelligence/fal-transcription.js';

type Upload = { id: string; socketId: string; npcId: string; chunks: Buffer[]; bytes: number; started: number; running: boolean; abort: AbortController };

export class ConversationMicrophone {
  private readonly uploads = new Map<string, Upload>();
  constructor(private readonly authorize: (identity: ConversationIdentity) => Promise<ActionResult>,
    private readonly provider: () => AudioTranscription | undefined, private readonly now = Date.now) {}

  append(socketId: string, identity: ConversationIdentity, id: string, index: number, data: string) {
    if (data.length > speechRecording.chunkBytes * 4 / 3 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))
      throw new TranscriptionError('The microphone recording is invalid.');
    if (index === 0) {
      this.cancelPlayer(identity.playerId);
      this.uploads.set(identity.playerId, { id, socketId, npcId: identity.npcId, chunks: [], bytes: 0, started: this.now(), running: false, abort: new AbortController() });
    }
    const upload = this.current(socketId, identity, id);
    if (upload.running || index !== upload.chunks.length) throw new TranscriptionError('Microphone upload was interrupted. Please speak again.');
    const chunk = Buffer.from(data, 'base64');
    upload.bytes += chunk.length;
    if (upload.bytes > speechRecording.maxBytes) {
      this.cancelPlayer(identity.playerId);
      throw new TranscriptionError('Try a shorter message—up to thirty seconds at a time.');
    }
    upload.chunks.push(chunk);
  }

  async transcribe(socketId: string, identity: ConversationIdentity, id: string): Promise<string> {
    const upload = this.current(socketId, identity, id);
    if (upload.running) throw new TranscriptionError('Speech recognition is already running.');
    upload.running = true;
    const signal = AbortSignal.any([upload.abort.signal, AbortSignal.timeout(45_000)]);
    try {
      const audio = Buffer.concat(upload.chunks); upload.chunks = [];
      await validateMicrophoneRecording(audio);
      const authorized = await this.authorize(identity);
      if (!authorized.ok) throw new TranscriptionError(authorized.message);
      signal.throwIfAborted();
      const microphone = this.provider();
      if (!microphone) throw new TranscriptionError('Microphone transcription is unavailable.');
      const text = await microphone.transcribe(audio, signal);
      signal.throwIfAborted();
      return text;
    } finally {
      if (this.uploads.get(identity.playerId) === upload) this.uploads.delete(identity.playerId);
    }
  }

  cancel(socketId: string, playerId: string, id?: string) {
    const upload = this.uploads.get(playerId);
    if (upload?.socketId === socketId && (!id || upload.id === id)) this.cancelPlayer(playerId);
  }

  cancelPlayer(playerId: string) {
    this.uploads.get(playerId)?.abort.abort();
    this.uploads.delete(playerId);
  }

  private current(socketId: string, identity: ConversationIdentity, id: string) {
    const upload = this.uploads.get(identity.playerId);
    if (!upload || upload.id !== id || upload.socketId !== socketId || upload.npcId !== identity.npcId || this.now() - upload.started > 60_000)
      throw new TranscriptionError('Microphone upload was interrupted. Please speak again.');
    return upload;
  }
}

export async function validateMicrophoneRecording(audio: Buffer): Promise<void> {
  try {
    if (audio.length < 44 || audio.length > speechRecording.maxBytes) throw new Error();
    const { format } = await parseBuffer(audio, { mimeType: 'audio/wav' }, { duration: true });
    if (format.container === 'WAVE' && format.codec === 'PCM' && format.sampleRate === speechRecording.sampleRate && format.numberOfChannels === 1
      && format.bitsPerSample === 16 && (format.duration ?? 0) >= 0.1 && (format.duration ?? Infinity) <= speechRecording.maxSeconds + 1) return;
  } catch {}
  throw new TranscriptionError('The microphone recording is invalid or too short. Please try again.');
}
