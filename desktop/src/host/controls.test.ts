import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { signDeskRequest } from '@/lib/deskSign';
import type { DeskRun } from '@/lib/deskProtocol';
import type { RunControl } from '@/lib/deskDispatch';
import { Controls } from './controls.ts';
import { ControlStore } from './controlStore.ts';
import { Dispatch } from './dispatch.ts';
import type { ManagedRuns } from './managedRuns.ts';
import type { HostDeps } from './api.ts';
import { CellarFallback } from './fallback.ts';
import { lanServer } from './http.ts';

const run = (id: string): DeskRun => ({ id, name: id, agent: 'codex', cwd: 'unused', startedAt: 1, state: 'running', origin: 'phone', entryId: null });
function makeHost(id: string, configured = false, client?: unknown) {
  const store = new ControlStore(':memory:'); let stops = 0; let owner = 'owner';
  const runs = [run(id === 'one' ? 'abcdef01' : 'abcdef02')];
  const deps = { identity: () => ({ id, name: id, key: 'test-key' }),
    account: { get current() { return { userId: owner }; }, configured, client: () => client, onChange: () => {} },
    runs: { list: async () => runs, stop: async (value: string) => { const row = runs.find((row) => row.id === value); if (!row) throw Error('unknown run'); stops++; row.state = 'stopped'; } },
  } as unknown as HostDeps;
  deps.controls = new Controls(deps, new Dispatch(store, { get: () => null, onIdle: () => {} } as unknown as ManagedRuns));
  return { deps, store, runs, stops: () => stops, owner: (next: string) => { owner = next; } };
}
test('signed phone controls recover lost stop reply and bind source/account without repeating stop', async () => {
  const host = makeHost('one'); const server = lanServer(host.deps, null);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); const port = (server.address() as { port: number }).port;
  const send = async (method: string, path: string, request?: unknown) => {
    const body = request ? JSON.stringify(request) : '';
    const authorization = await signDeskRequest({ key: 'test-key', method, path, body, ts: Date.now(), nonce: randomBytes(16).toString('hex'), sha256: async (data) => new Uint8Array(createHash('sha256').update(data).digest()) });
    const result = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { authorization }, ...(body ? { body } : {}) }); return { status: result.status, body: await result.json() as any };
  };
  try {
    const request: RunControl = { commandId: randomUUID(), action: 'stop', runId: 'abcdef01', source: 'pc' };
    assert.equal((await send('POST', '/run-controls', request)).body.receipt.state, 'confirmed');
    assert.equal((await send('GET', `/run-controls/${request.commandId}`)).body.receipt.state, 'confirmed');
    assert.equal((await send('POST', '/run-controls', request)).body.receipt.state, 'confirmed'); assert.equal(host.stops(), 1);
    assert.equal((await send('POST', '/run-controls', { ...request, runId: 'abcdef02' })).status, 409);
    host.owner('other'); assert.equal((await send('GET', `/run-controls/${request.commandId}`)).body.receipt, null);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); host.store.close(); }
});
test('Stop all targets every account host; offline pending settles through same durable mailbox control', async () => {
  const mailbox = new Map<string, any>(); let inserts = 0;
  const client = { from: (table: string) => table === 'cellar_desks' ? { select: async () => ({ data: [{ id: 'one', name: 'one' }, { id: 'two', name: 'two' }], error: null }) }
    : { select: () => ({ eq: (_key: string, id: string) => ({ maybeSingle: async () => ({ data: mailbox.get(id) ?? null, error: null }) }) }),
      insert: async (row: any) => { inserts++; mailbox.set(row.id, { ...row, state: 'queued', created_at: new Date().toISOString() }); return { error: null }; },
      update: (patch: any) => { let id = ''; const query = { eq: (key: string, value: string) => { if (key === 'id') id = value; return query; },
        select: async () => { const row = mailbox.get(id); if (row?.state !== 'queued') return { data: [] }; Object.assign(row, patch); return { data: [{ id }] }; },
        then: (resolve: (value: unknown) => unknown) => { Object.assign(mailbox.get(id), patch); return Promise.resolve({ error: null }).then(resolve); } }; return query; } } };
  const first = makeHost('one', true, client); const second = makeHost('two', false, client);
  try {
    const request: RunControl = { commandId: randomUUID(), action: 'stopAll', scope: 'account', runId: null, source: 'pc' };
    const pending = await first.deps.controls!.run(request); assert.equal(pending.state, 'pending'); assert.equal(first.stops(), 1); assert.equal(second.stops(), 0);
    await first.deps.controls!.receipt(request.commandId); assert.equal(inserts, 1);
    const fallback = new CellarFallback(second.deps); const row = [...mailbox.values()][0];
    await (fallback as any).take({ ...row });
    assert.equal(second.stops(), 1);
    const done = await first.deps.controls!.receipt(request.commandId); assert.equal(done?.state, 'confirmed'); assert.equal(done?.hosts?.length, 2);
    await first.deps.controls!.run(request); assert.equal(first.stops(), 1); assert.equal(second.stops(), 1); assert.equal(inserts, 1);
  } finally { first.store.close(); second.store.close(); }
});
