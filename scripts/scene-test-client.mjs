import assert from 'node:assert/strict';
const connections = new Map();
export async function sceneAction(origin, credentials, state, action) {
  const player = state.players.find(player => player.id === credentials.playerId);
  const key = `${credentials.roomId}/${credentials.playerId}`;
  let connection = connections.get(key);
  if (!connection || connection.location !== player.location || connection.visit !== player.positionEpoch) {
    connection?.socket.close();
    const response = await fetch(`${origin}/api/cases/${credentials.roomId}/scene-socket`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Player-Id': credentials.playerId, Authorization: `Bearer ${credentials.secret}` }, body: '{}' });
    assert.equal(response.ok, true, await response.clone().text());
    const grant = await response.json();
    const socket = new WebSocket(grant.websocketUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    connection = { socket, location: grant.location, visit: grant.visit };
    connections.set(key, connection);
  }
  const requestId = crypto.randomUUID(), socket = connection.socket;
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); socket.removeEventListener('message', receive); };
    const receive = event => { const message = JSON.parse(event.data); if (message.type === 'result' && message.requestId === requestId) { cleanup(); resolve(message.result); } };
    const timer = setTimeout(() => { cleanup(); reject(new Error('Scene command timed out.')); }, 15000);
    socket.addEventListener('message', receive);
    socket.send(JSON.stringify({ requestId, action }));
  });
}
export function closeSceneClients() { for (const {socket} of connections.values()) socket.close(); connections.clear(); }
