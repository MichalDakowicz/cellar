import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { checkpointGit as git } from './checkpointGit.ts';
import { Checkpoints } from './checkpoints.ts';
import { handle, type HostDeps } from './api.ts';

test('checkpoint review rejects stale files, restores conversation + files once, survives lost reply and isolates owner', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-checkpoint-flow-')); let owner = 'owner'; let turns = 1; let restores = 0; let busy = false;
  const row = { id: 'abcdef01', owner: 'owner', projectId: 'p', cwd: dir, where: 'main', agent: 'codex' };
  const session = { busy: () => busy, point: () => ({ turns, sessionId: 'thread', anchor: 'turn' }), restore: async (point: { turns: number }, files: () => Promise<void>) => { restores++; turns = point.turns; await files(); } };
  const deps = { account: { get current() { return { userId: owner }; }, commandProjects: async () => [{ projectId: 'p', path: dir }] },
    runs: { ownedForSearch: (id: string, user: string) => id === row.id && user === row.owner ? row : null, list: async () => [], runtime: { get: (user: string) => user === 'owner' ? { session } : null } },
    controls: { queue: () => ({ items: [] }) } } as unknown as HostDeps;
  try {
    await git(dir, ['init']); writeFileSync(join(dir, 'code.txt'), 'before');
    const checkpoints = new Checkpoints(dir, deps); deps.checkpoints = checkpoints;
    const checkpoint = await checkpoints.capture('owner', row.id, dir, { turns: 0 }, 'before');
    writeFileSync(join(dir, 'code.txt'), 'after');
    const review = await checkpoints.review(row.id, checkpoint.id); assert.ok(review.diff.includes('before'));
    writeFileSync(join(dir, 'code.txt'), 'changed since review');
    await assert.rejects(checkpoints.rollback({ commandId: randomUUID(), runId: row.id, checkpointId: checkpoint.id, token: review.token }), /review again/);
    assert.equal(restores, 0);
    const next = await checkpoints.review(row.id, checkpoint.id);
    const request = { commandId: randomUUID(), runId: row.id, checkpointId: checkpoint.id, token: next.token };
    assert.equal((await checkpoints.rollback(request)).state, 'applied'); assert.equal(restores, 1); assert.equal(turns, 0);
    assert.equal(readFileSync(join(dir, 'code.txt'), 'utf8'), 'before');
    const restarted = new Checkpoints(dir, deps); assert.equal((await restarted.rollback(request)).state, 'applied'); assert.equal(restores, 1);
    assert.equal(restarted.receipt(request)?.state, 'applied');
    assert.throws(() => restarted.receipt({ ...request, runId: 'another' }), /reused/);
    owner = 'other'; await assert.rejects(restarted.list(row.id));
    assert.equal(restarted.receipt(request), null);
    assert.equal((await handle(deps, { method: 'POST', path: '/provider-accounts', source: 'phone', body: {} })).status, 403);
    owner = 'owner'; busy = true; await assert.rejects(checkpoints.review(row.id, checkpoint.id), /idle/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
