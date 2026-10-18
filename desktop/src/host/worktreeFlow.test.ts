import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { DeskRun, DeskStart } from '@/lib/deskProtocol';
import { signDeskRequest } from '@/lib/deskSign';
import { repoKey } from '@/lib/repoLink';
import { handle } from './api.ts';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { lanServer } from './http.ts';
import { Receipts } from './receipts.ts';
import { startTask } from './startTask.ts';
import { worktreeFixture } from './worktreeFixture.ts';

test('full task creates one workspace/run; a proven trust refusal retries the same workspace', async () => {
  const f = await worktreeFixture();
  const events: string[] = [];
  let untrusted = true;
  const deps = { account: f.account, worktrees: f.manager, runs: { start: async (task: DeskStart & { branch?: string }) => {
    events.push('launch'); assert.notEqual(task.cwd, f.root); assert.ok(task.branch?.startsWith('test/isolated-workspace-'));
    if (untrusted) throw new DeskError('trust this workspace', 409, { notStarted: true, untrusted: task.cwd });
    const run = { ...task, id: 'abcdef01', name: 'test', state: 'done', origin: 'phone', startedAt: Date.now() } as DeskRun;
    f.runs.push(run); return run;
  } } } as unknown as HostDeps;
  f.account.claimTaskEntries = async () => { events.push('claim'); };
  f.account.releaseTaskEntries = async () => { events.push('release'); };
  const receipts = new Receipts(f.data);
  try {
    const launch = (task: DeskStart) => receipts.start('owner', task, () => startTask(deps, task, async () => 'test-agent'));
    await assert.rejects(launch(f.request), /trust/);
    assert.deepEqual(events.splice(0), ['claim', 'launch', 'release']);
    const path = (await f.manager.list())[0].worktrees.find((row) => row.id === f.request.worktreeId)!.path;
    assert.equal(await f.manager.allows(path), true);
    untrusted = false;
    const retry = { ...f.request, commandId: randomUUID() };
    const [one, two] = await Promise.all([launch(retry), launch(retry)]);
    assert.equal(one.id, two.id); assert.equal(repoKey(one.cwd), repoKey(path)); assert.equal(f.runs.length, 1);
    assert.ok(one.cwd.length - f.data.length < 90, 'managed directory nesting stays short on Windows');
    assert.deepEqual(events, ['claim', 'launch']);
    assert.equal((await f.manager.list())[0].worktrees.length, 2);
    assert.equal(f.names.length, 1, 'a proven pre-launch retry reuses the generated name');
    await assert.rejects(startTask(deps, { ...retry, commandId: randomUUID() }, async () => 'test-agent'), /already has a run/);
  } finally { await f.dispose(); }
});

test('signed phone lifecycle reads actual Git and recovers a lost reply without replay; IPC shares API', async () => {
  const f = await worktreeFixture();
  const workspace = await f.manager.create(f.request); f.finished(workspace.path);
  const key = randomBytes(24).toString('base64url');
  const deps = { identity: () => ({ key }), account: f.account, worktrees: f.manager } as unknown as HostDeps;
  const server = lanServer(deps, null);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const send = async (method: string, path: string, input?: unknown) => {
    const body = input === undefined ? '' : JSON.stringify(input);
    const authorization = await signDeskRequest({ key, method, path, body, ts: Date.now(), nonce: randomBytes(16).toString('hex'),
      sha256: async (data) => new Uint8Array(createHash('sha256').update(data).digest()) });
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { authorization, 'content-type': 'application/json' }, body: body || undefined });
    assert.equal(response.status, 200); return response.json() as Promise<Record<string, any>>;
  };
  try {
    assert.equal((await fetch(`http://127.0.0.1:${port}/worktrees`)).status, 401);
    assert.equal((await send('GET', '/worktrees')).projects[0].worktrees.length, 2);
    assert.deepEqual((await handle(deps, { method: 'GET', path: '/worktrees' })).body, await send('GET', '/worktrees'));
    const { review } = await send('POST', `/worktrees/${workspace.id}/review`, { action: 'remove' });
    assert.equal(review.allowed, true);
    const request = { commandId: randomUUID(), worktreeId: workspace.id, action: 'remove', token: review.token };
    // Discard the action reply as if the connection died after the host removed the folder.
    await send('POST', `/worktrees/${workspace.id}`, request);
    const recovered = await send('GET', `/worktree-requests/${request.commandId}`);
    assert.equal(recovered.receipt.state, 'confirmed');
    assert.deepEqual((await send('POST', `/worktrees/${workspace.id}`, request)).receipt, recovered.receipt);
    assert.equal((await send('GET', '/worktrees')).projects[0].worktrees.length, 1);
    f.account.current!.userId = 'other';
    assert.equal((await send('GET', `/worktree-requests/${request.commandId}`)).receipt, null);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve())); f.account.current!.userId = 'owner'; await f.dispose();
  }
});
