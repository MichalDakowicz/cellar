import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { DeskRun, DeskStart } from '@/lib/deskProtocol';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { Receipts } from './receipts.ts';
import { startTask } from './startTask.ts';

test('task preflight refuses unsupported choices; reserves all attachments before launch', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-task-'));
  const request: DeskStart = { commandId: '00000000-0000-4000-8000-000000000001', projectId: 'project',
    agent: 'codex', cwd: dir, prompt: 'test', name: null, entryId: 'a', entryIds: ['a', 'b'], where: 'main', mode: 'ask' };
  const events: string[] = [];
  let launchError: Error | null = null;
  let claimError: Error | null = null;
  const deps = {
    account: { current: { userId: 'owner' }, commandProjects: async () => [{ projectId: 'project', path: dir }],
      claimTaskEntries: async (task: DeskStart) => { events.push('claim'); assert.deepEqual(task.entryIds, ['a', 'b']); if (claimError) throw claimError; },
      releaseTaskEntries: async () => { events.push('release'); } },
    runs: { start: async (task: DeskStart) => {
      events.push('launch'); assert.equal(task.mode, 'ask'); if (launchError) throw launchError;
      return { id: 'abcdef01', state: 'running' } as DeskRun;
    } },
  } as unknown as HostDeps;
  const installed = async () => 'test-agent';
  try {
    await assert.rejects(startTask(deps, { ...request, where: 'worktree' }, installed), /Update Cellar/);
    await assert.rejects(startTask(deps, { ...request, agent: 'agy' }, installed), /edits ok/);
    await assert.rejects(startTask(deps, { ...request, projectId: 'other' }, installed), /no folder/);
    await assert.rejects(startTask(deps, request, async () => null), /not installed/);
    assert.deepEqual(events, []);
    await startTask(deps, request, installed);
    assert.deepEqual(events.splice(0), ['claim', 'launch']);
    launchError = new DeskError('not trusted', 409, { notStarted: true });
    await assert.rejects(startTask(deps, request, installed), /not trusted/);
    assert.deepEqual(events.splice(0), ['claim', 'launch', 'release']);
    launchError = new Error('launch reply lost');
    await assert.rejects(startTask(deps, request, installed), /reply lost/);
    assert.deepEqual(events.splice(0), ['claim', 'launch']);
    claimError = new Error('claim reply lost');
    const receipts = new Receipts(dir);
    await assert.rejects(receipts.start('owner', request, () => startTask(deps, request, installed)), /claim reply lost/);
    assert.equal(receipts.get('owner', request.commandId!)?.state, 'unknown');
    assert.deepEqual(events, ['claim']);
  } finally { assert.ok(dir.startsWith(join(tmpdir(), 'cellar-task-'))); rmSync(dir, { recursive: true, force: true }); }
});
