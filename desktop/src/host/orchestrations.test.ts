import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { worktreeFixture, projectId } from './worktreeFixture.ts';
import { Orchestrations } from './orchestrations.ts';
import { Receipts } from './receipts.ts';
import { git } from './worktreeGit.ts';
import type { HostDeps } from './api.ts';
import type { DeskStart, DeskRun } from '@/lib/deskProtocol';
test('race pins both worktrees before main changes, retains results and recovers IDs without replay', async () => {
  const f = await worktreeFixture(); let starts = 0;
  try {
    const base = await git(f.root, 'rev-parse', 'HEAD');
    const deps = { account: f.account, worktrees: f.manager, receipts: new Receipts(f.data), runs: { list: async () => f.runs, log: async () => [], start: async (start: DeskStart & { branch?: string }) => {
      starts++; assert.equal(await git(start.cwd, 'rev-parse', 'HEAD'), base);
      const run: DeskRun = { ...start, id: starts === 1 ? 'abcdef01' : 'abcdef02', startedAt: Date.now(), state: 'done', name: start.name ?? 'race', origin: 'phone', entryId: null };
      f.runs.push(run);
      if (starts === 1) { writeFileSync(join(f.root, 'file.txt'), 'main advanced\n'); await git(f.root, 'commit', '-am', 'advance main'); }
      return run;
    } } } as unknown as HostDeps;
    const plans = new Orchestrations(f.data, deps, Date.now, async () => 'fixture');
    const req = { commandId: randomUUID(), kind: 'race', projectIds: [projectId], agents: ['codex', 'codex'], prompt: 'Compare', mode: 'ask' };
    await plans.create(req); await plans.tick(); assert.equal(starts, 2);
    await plans.create(req); await plans.tick(); assert.equal(starts, 2);
    assert.ok((await f.manager.list())[0].worktrees.filter((t) => t.id).every((t) => t.kept));
    const action = { commandId: randomUUID(), id: req.commandId, action: 'pick', runId: 'abcdef01' };
    await plans.act(action, 'pc'); assert.equal((await plans.list())[0].picked, 'abcdef01');
    assert.equal((await plans.act(action, 'pc')).state, 'confirmed');
    assert.equal((await f.manager.list())[0].worktrees.filter((t) => t.id).length, 1);
    const restarted = new Orchestrations(f.data, deps, Date.now, async () => 'fixture'); await restarted.tick(); assert.equal(starts, 2);
    f.account.current!.userId = 'other'; assert.deepEqual(await restarted.list(), []);
  } finally { f.account.current!.userId = 'owner'; await f.dispose(); }
});
test('night window, cap, stop all and interrupted dispatch do not launch unapproved extra work', async () => {
  const f = await worktreeFixture(); let now = 100000; let starts = 0;
  try {
    const deps = { account: f.account, worktrees: f.manager, receipts: new Receipts(f.data), runs: { list: async () => f.runs, log: async () => [], start: async (start: DeskStart) => { starts++; const run = { ...start, id: 'abcdef01', name: 'night', state: 'done', origin: 'phone', startedAt: now } as DeskRun; f.runs.push(run); return run; } } } as unknown as HostDeps;
    const plans = new Orchestrations(f.data, deps, () => now, async () => 'fixture');
    const req = { commandId: randomUUID(), kind: 'night', projectIds: [projectId], agents: ['codex'], prompt: 'Work tonight', mode: 'ask', startsAt: now + 1000, endsAt: now + 10000, maxRuns: 1, reservePercent: 20 };
    await plans.create(req); await plans.tick(); assert.equal(starts, 0);
    now += 1000; await plans.tick(); assert.equal(starts, 1); await plans.tick(); assert.equal(starts, 1);
    await plans.create({ ...req, commandId: randomUUID(), startsAt: now + 1000, endsAt: now + 10000 }); plans.stopQueued(); now += 1000; await plans.tick(); assert.equal(starts, 1);
    const file = join(f.data, 'orchestrations.json'); const stored = JSON.parse(readFileSync(file, 'utf8'));
    stored.rows[0].stopped = false; stored.rows[0].members[0].state = 'starting'; stored.rows[0].members[0].start.commandId = randomUUID(); delete stored.rows[0].members[0].runId; writeFileSync(file, JSON.stringify(stored));
    const restart = new Orchestrations(f.data, deps, () => now, async () => 'fixture'); await restart.tick(); assert.equal(starts, 1); assert.equal((await restart.list()).find((p) => p.id === req.commandId)!.members[0].state, 'unknown');
  } finally { await f.dispose(); }
});
