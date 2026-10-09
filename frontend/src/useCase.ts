import { useCallback, useEffect, useRef, useState } from 'react';
import type { Action, ActionResult, CaseView, Credentials } from '../../shared/game/types';
import { CaseSocketClient } from './game/case-socket-client';
import type { SceneView } from '../../shared/game/scene-socket';
import { overlayConversation } from './game/conversation-overlay';
import { overlayScene } from './game/scene-overlay';
export function headers(c: Credentials) { return { 'Content-Type': 'application/json', 'X-Player-Id': c.playerId, Authorization: `Bearer ${c.secret}` }; }
export function useCase(credentials: Credentials | null) {
  const [state, setState] = useState<CaseView | null>(null);
  const [connection, setConnection] = useState<'connecting' | 'live' | 'reconnecting'>('connecting');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const channel = useRef<CaseSocketClient | null>(null);
  const sceneChannel = useRef<CaseSocketClient | null>(null);
  const conversations = useRef(new Map<string, CaseSocketClient>());
  const liveScene = useRef<SceneView | null>(null);
  useEffect(() => {
    setState(null);
    if (!credentials) return;
    const client = new CaseSocketClient(async signal => {
      const response = await fetch(`/api/cases/${credentials.roomId}/socket`, { method: 'POST', headers: headers(credentials), signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not connect to the case.');
      return data;
    }, {
      status: (value, message = '') => { setConnection(value); setError(message); },
      update: event => {
        if (event.type === 'update') setState(previous => !previous || event.state.revision >= previous.revision ? overlayScene({ ...event.state, receivedAt: Date.now() }, liveScene.current) : previous);
      },
    });
    channel.current = client;
    client.start();
    return () => { channel.current = null; client.stop(); };
  }, [credentials]);
  const self = state?.players.find(player => player.id === credentials?.playerId);
  useEffect(() => {
    liveScene.current = null;
    if (!credentials || !self) return;
    const client = new CaseSocketClient(async signal => {
      const response = await fetch(`/api/cases/${credentials.roomId}/scene-socket`, { method: 'POST', headers: headers(credentials), signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not connect to the scene.');
      return data;
    }, {
      status: (_status, message) => { if (message) setError(message); },
      update: event => {
        if (event.type !== 'scene') return;
        if (liveScene.current && event.state.revision < liveScene.current.revision) return;
        liveScene.current = event.state;
        setState(previous => previous ? overlayScene(previous, event.state) : previous);
      },
    });
    sceneChannel.current = client;
    client.start();
    return () => { sceneChannel.current = null; client.stop(); };
  }, [credentials, self?.location, self?.positionEpoch]);
  const conversationIds = state?.npcs.filter(npc => npc.intelligent && npc.location === self?.location && (npc.lease || npc.pendingTurn)).map(npc => npc.id).sort().join(',') ?? '';
  useEffect(() => () => {
    for (const client of conversations.current.values()) client.stop();
    conversations.current.clear();
  }, [credentials]);
  useEffect(() => {
    if (!credentials) return;
    const clients = conversations.current;
    const wanted = new Set(conversationIds ? conversationIds.split(',') : []);
    for (const [npcId, client] of clients) if (!wanted.has(npcId)) { client.stop(); clients.delete(npcId); }
    for (const npcId of wanted) {
      if (clients.has(npcId)) continue;
      let revision = -1;
      const client = new CaseSocketClient(async signal => {
        const response = await fetch(`/api/cases/${credentials.roomId}/conversation-socket`, {
          method: 'POST', headers: headers(credentials), body: JSON.stringify({ npcId }), signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not connect to the conversation.');
        return data;
      }, {
        status: (_status, message) => { if (message) setError(message); },
        update: event => {
          if (event.type !== 'conversation' || event.state.revision < revision) return;
          revision = event.state.revision;
          setState(previous => previous ? overlayConversation(previous, event.state) : previous);
        },
      });
      clients.set(npcId, client); client.start();
    }
  }, [credentials, conversationIds]);
  const act = useCallback(async (action: Action, silent = false): Promise<ActionResult> => {
    if (!credentials) return { ok: false, message: 'Join a case first.' };
    if (!silent) setPending(true);
    try {
      if (action.type === 'move' || action.type === 'wave') return await (sceneChannel.current?.act(action) ?? Promise.resolve({ ok: false, message: 'Connecting to the scene.' }));
      if (action.type === 'end') await conversations.current.get(action.npcId)?.act({ type: 'cancel', npcId: action.npcId });
      if (action.type !== 'question') return await (channel.current?.act(action) ?? Promise.resolve({ ok: false, message: 'Reconnect to your case before acting.' }));
      return await (conversations.current.get(action.npcId)?.act(action) ?? Promise.resolve({ ok: false, message: 'Connecting to the conversation.' }));
    } catch (e) { return { ok: false, message: e instanceof Error ? e.message : 'The action could not be saved. Reconnect and try again.' }; }
    finally { if (!silent) setPending(false); }
  }, [credentials]);
  const microphone = useCallback(async (npcId: string, audio: Blob, signal: AbortSignal): Promise<string> => {
    if (!credentials) throw new Error('Join a case first.');
    const client = conversations.current.get(npcId);
    if (!client) throw new Error('Connecting to the conversation.');
    return client.transcribe(audio, signal);
  }, [credentials]);
  return { state, connection, error, pending, act, microphone };
}
