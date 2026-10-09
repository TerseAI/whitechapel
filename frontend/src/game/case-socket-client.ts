import type { CaseCommand, CaseEvent } from '../../../shared/game/case-socket';
import type { ConversationCommand, ConversationControl, ConversationEvent, ConversationResult } from '../../../shared/game/conversation-socket';
import { speechRecording } from '../../../shared/game/speech-recording';
import type { SceneEvent } from '../../../shared/game/scene-socket';
import type { Action, ActionResult } from '../../../shared/game/types';
import type { CaseSocketGrant } from '../../../shared/game/case-socket';

type Incoming = { requestId: string; action: CaseCommand['action'] | ConversationCommand['action'] };
type Outgoing = CaseEvent | SceneEvent | ConversationEvent;
type Socket = Pick<WebSocket, 'readyState' | 'send' | 'close' | 'addEventListener'>;
type Observer = { update(event: Exclude<Outgoing, { type: 'result' }>): void; status(value: 'connecting' | 'live' | 'reconnecting', error?: string): void };
type Pending = { finish(result: ConversationResult): void; timer: ReturnType<typeof setTimeout> };
const interrupted = 'Connection interrupted. Reconnecting to your saved case.';

export class CaseSocketClient {
  private readonly abort = new AbortController();
  private readonly pending = new Map<string, Pending>();
  private socket?: Socket;
  private live = false;
  private retry?: ReturnType<typeof setTimeout>;
  private deadline?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;

  constructor(private readonly grant: (signal: AbortSignal) => Promise<Pick<CaseSocketGrant, 'websocketUrl' | 'connectByMs'> & { liveInterviews?: boolean }>, private readonly observer: Observer,
    private readonly openSocket: (url: string) => Socket = url => new WebSocket(url)) {}

  start() {
    this.observer.status('connecting');
    void this.connect();
    this.heartbeat = setInterval(() => {
      if (this.live) void this.act({ type: 'heartbeat' }).then(result => { if (!result.ok) this.reconnect(); });
    }, 20_000);
  }

  stop() {
    this.abort.abort();
    clearTimeout(this.retry); clearInterval(this.heartbeat);
    this.disconnect();
  }

  act(action: Action | ConversationControl, signal?: AbortSignal): Promise<ConversationResult> {
    if (signal?.aborted) return Promise.resolve({ ok: false, message: 'Cancelled.' });
    if (!this.live || this.socket?.readyState !== 1) return Promise.resolve({ ok: false, message: 'Reconnect to your case before acting.' });
    const requestId = crypto.randomUUID();
    const command: Incoming = { requestId, action };
    return new Promise(resolve => {
      const finish = (result: ConversationResult) => {
        clearTimeout(timer); this.pending.delete(requestId); signal?.removeEventListener('abort', cancelled); resolve(result);
      };
      const cancelled = () => finish({ ok: false, message: 'Cancelled.' });
      const timer = setTimeout(() => {
        finish({ ok: false, message: 'The action was not confirmed. Check your case before trying again.' });
        this.reconnect();
      }, action.type === 'question' ? 360_000 : action.type === 'transcribe' ? 60_000 : 20_000);
      this.pending.set(requestId, { finish, timer });
      signal?.addEventListener('abort', cancelled, { once: true });
      try { this.socket!.send(JSON.stringify(command)); }
      catch { this.reconnect(); }
    });
  }

  async transcribe(audio: Blob, signal: AbortSignal): Promise<string> {
    signal.throwIfAborted();
    if (audio.size < 44 || audio.size > speechRecording.maxBytes) throw new Error('Try a shorter message—up to thirty seconds at a time.');
    const bytes = new Uint8Array(await audio.arrayBuffer());
    signal.throwIfAborted();
    const uploadId = crypto.randomUUID();
    const cancel = () => { void this.act({ type: 'cancelMicrophone', uploadId }); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
      const chunks = [];
      for (let offset = 0, index = 0; offset < bytes.length; offset += speechRecording.chunkBytes, index++) {
        const data = btoa(String.fromCharCode(...bytes.subarray(offset, offset + speechRecording.chunkBytes)));
        chunks.push(this.act({ type: 'audioChunk', uploadId, index, data }, signal));
      }
      for (const result of await Promise.all(chunks)) if (!result.ok) throw new Error(result.message);
      signal.throwIfAborted();
      const result = await this.act({ type: 'transcribe', uploadId }, signal);
      signal.throwIfAborted();
      if (!result.ok || result.transcript === undefined) throw new Error(result.message || 'Speech recognition failed. Please try again.');
      return result.transcript;
    } catch (error) {
      if (!signal.aborted) cancel();
      throw error;
    } finally { signal.removeEventListener('abort', cancel); }
  }

  private async connect() {
    try {
      const grant = await this.grant(AbortSignal.any([this.abort.signal, AbortSignal.timeout(30_000)]));
      if (this.abort.signal.aborted) return;
      const socket = this.socket = this.openSocket(grant.websocketUrl);
      this.deadline = setTimeout(() => this.reconnect(), 30_000);
      socket.addEventListener('message', event => {
        if (this.socket === socket) this.receive(event.data, grant.liveInterviews ?? false);
      });
      const lost = () => { if (this.socket === socket) this.reconnect(); };
      socket.addEventListener('close', lost); socket.addEventListener('error', lost);
    } catch (error) {
      if (!this.abort.signal.aborted) this.reconnect(error instanceof Error ? error.message : interrupted);
    }
  }

  private receive(frame: unknown, liveInterviews: boolean) {
    if (typeof frame !== 'string') return;
    let event: Outgoing;
    try { event = JSON.parse(frame); } catch { return; }
    if (!event || typeof event !== 'object') return;
    if (event.type === 'result') {
      const pending = this.pending.get(event.requestId);
      if (pending) { clearTimeout(pending.timer); this.pending.delete(event.requestId); pending.finish(event.result); }
    }
    if (event.type === 'update') {
      if (!event.state) return;
      clearTimeout(this.deadline);
      this.live = true; this.observer.status('live');
      if (!liveInterviews) event.state.npcs = event.state.npcs.map(npc => ({ ...npc, intelligent: false }));
      this.observer.update(event);
    }
    if (event.type === 'conversation') {
      if (!event.state) return;
      const first = !this.live;
      clearTimeout(this.deadline); this.live = true; this.observer.status('live'); this.observer.update(event);
      if (first) void this.act({ type: 'heartbeat' });
    }
    if (event.type === 'scene') {
      clearTimeout(this.deadline); this.live = true; this.observer.status('live'); this.observer.update(event);
    }
  }

  private reconnect(message = interrupted) {
    if (this.abort.signal.aborted) return;
    this.disconnect();
    this.observer.status('reconnecting', message);
    clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.connect(), 1500);
  }

  private disconnect() {
    clearTimeout(this.deadline);
    this.live = false;
    const socket = this.socket; this.socket = undefined;
    socket?.close();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.finish({ ok: false, message: interrupted });
    }
    this.pending.clear();
  }
}
