import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash, randomBytes } from 'node:crypto';
import { WebSocket } from 'ws';
import { signDeskRequest } from '@/lib/deskSign';
import { EMPTY_STREAM, readStreamMessage, reduceStream, type StreamState } from '@/lib/deskEvents';
import type { DeskRun } from '@/lib/deskProtocol';
import { lanServer } from './http.ts';
import { EventStore } from './eventStore.ts';
import { Tickets } from './tickets.ts';
import type { HostDeps } from './api.ts';
import { randomUUID } from 'node:crypto';

test('signed phone snapshot, replay, live, reconnect, ticket expiry and account revocation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-socket-')); const store = new EventStore(join(dir, 'events.sqlite'));
  let owner = 'owner'; let key = randomBytes(24).toString('base64url'); let now = Date.now(); let readError: string | null = null;
  const run: DeskRun = { id: 'abcdef01', agent: 'codex', name: 'real output', cwd: dir, startedAt: now, state: 'running', origin: 'phone', entryId: null };
  store.catalog(owner, [run]);
  const deps = { identity: () => ({ key, port }), account: { get current() { return { userId: owner }; } }, lanHost: () => '127.0.0.1',
    tickets: new Tickets(() => now), events: { store, refresh: async () => {}, get error() { return readError; } } } as unknown as HostDeps;
  const server = lanServer(deps, null); await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const sockets: WebSocket[] = [];
  const ticket = async () => {
    const authorization = await signDeskRequest({ key, method: 'POST', path: '/event-ticket', body: '', ts: Date.now(), nonce: randomBytes(16).toString('hex'), sha256: async (data) => new Uint8Array(createHash('sha256').update(data).digest()) });
    const res = await fetch(`http://127.0.0.1:${port}/event-ticket`, { method: 'POST', headers: { authorization } });
    assert.equal(res.status, 200); return ((await res.json()) as { url: string }).url;
  };
  const connect = async (url: string, cursor = 0, epoch = '') => {
    const ws = new WebSocket(url); sockets.push(ws); let state: StreamState = { ...EMPTY_STREAM }; const messages: any[] = [];
    ws.on('message', (data) => { const message = readStreamMessage(JSON.parse(data.toString())); assert.ok(message); messages.push(message); state = reduceStream(state, message); });
    await new Promise<void>((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    ws.send(JSON.stringify({ type: 'subscribe', runId: run.id, afterSequence: cursor, epoch }));
    const until = async (predicate: () => boolean) => { const end = Date.now() + 5000; while (!predicate()) { if (Date.now() > end) throw Error('socket state timeout'); await new Promise((resolve) => setTimeout(resolve, 10)); } };
    await until(() => state.phase === 'live' || state.phase === 'failed');
    return { ws, messages, state: () => state, until };
  };
  const refused = async (url: string) => {
    const ws = new WebSocket(url); sockets.push(ws); ws.on('error', () => {});
    await new Promise<void>((resolve) => ws.once('unexpected-response', (_req, res) => { assert.equal(res.statusCode, 403); res.resume(); resolve(); }));
  };
  try {
    const unsigned = await fetch(`http://127.0.0.1:${port}/event-ticket`, { method: 'POST' }); assert.equal(unsigned.status, 401);
    const url = await ticket(); const client = await connect(url); assert.equal(client.state().phase, 'live');
    store.approvals(owner, [{ id: randomUUID(), runId: run.id, agent: 'codex', what: 'command', subject: 'echo test', effect: dir, always: null, state: 'pending', createdAt: now }]);
    await client.until(() => client.messages.some((message) => message.type === 'event'));
    assert.equal(client.messages.find((message) => message.type === 'event').event.kind, 'catalog'); // Older clients never receive the new event kind.
    assert.equal(client.messages[0].type, 'snapshot'); assert.ok(client.messages.some((message) => message.type === 'synchronized'));
    await refused(url); // Used ticket cannot open a second client.
    store.ingest(owner, run.id, 'source', 1, '{}', [{ id: 'cmd', kind: 'command_execution', text: 'command — test', status: 'running' }]);
    await client.until(() => client.state().items.length === 1);
    const cursor = client.state().sequence; client.ws.terminate();
    store.ingest(owner, run.id, 'source', 2, '{}', [{ id: 'cmd', kind: 'command_execution', text: 'command — test', status: 'failed', detail: 'real exit 1' }]);
    const resumed = await connect(await ticket(), cursor, store.epoch);
    assert.equal(resumed.state().items.length, 1); assert.equal(resumed.state().items[0].status, 'failed');
    assert.ok(resumed.messages.some((message) => message.type === 'event' && message.event.sequence === cursor + 1));
    readError = 'claude agents did not answer';
    await resumed.until(() => resumed.state().phase === 'failed'); assert.equal(resumed.state().error, readError); readError = null;
    const late = await ticket(); now += 61_000; await refused(late);
    const rotated = await ticket(); key = randomBytes(24).toString('base64url'); await refused(rotated);
    const current = await connect(await ticket()); const closed = new Promise<void>((resolve) => current.ws.once('close', () => resolve()));
    owner = 'other'; await closed;
    const other = await connect(await ticket()); assert.equal(other.state().phase, 'failed'); assert.equal(other.state().items.length, 0);
  } finally {
    for (const socket of sockets) socket.terminate();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-socket-'))); rmSync(dir, { recursive: true, force: true });
  }
});
