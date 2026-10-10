import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { DeskRun, DeskStart } from '@/lib/deskProtocol';
import { DeskError } from './claudeRuns.ts';
import { Receipts } from './receipts.ts';

const request: DeskStart = { commandId: '00000000-0000-4000-8000-000000000001', projectId: '00000000-0000-4000-8000-000000000002',
  agent: 'claude', cwd: 'C:/project', prompt: 'test', name: null, entryId: null, entryIds: [], where: 'main', mode: 'edits' };
const run: DeskRun = { id: 'abcd1234', agent: 'claude', cwd: request.cwd, name: 'test', entryId: null, startedAt: 1, state: 'running', origin: 'phone' };

test('receipts deduplicate concurrent/restarted retries and reject payload changes', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-receipts-'));
  try {
    const receipts = new Receipts(dir);
    let starts = 0;
    const work = async () => { starts++; await new Promise((resolve) => setTimeout(resolve, 20)); return run; };
    const results = await Promise.all([receipts.start('owner', request, work), receipts.start('owner', request, work)]);
    assert.equal(starts, 1);
    assert.deepEqual(results, [run, run]);
    const reloaded = new Receipts(dir);
    assert.deepEqual(await reloaded.start('owner', request, work), run);
    assert.equal(starts, 1);
    await assert.rejects(reloaded.start('owner', { ...request, prompt: 'different' }, work), /different task/);
    assert.equal(reloaded.get('other', request.commandId!), null);
  } finally { assert.ok(dir.startsWith(join(tmpdir(), 'cellar-receipts-'))); rmSync(dir, { recursive: true, force: true }); }
});

test('uncertain failures and interrupted starts never execute twice; proven refusals remain failed', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-receipts-'));
  try {
    const receipts = new Receipts(dir);
    let starts = 0;
    const fail = async (): Promise<DeskRun> => { starts++; throw new Error('reply lost after launch'); };
    await assert.rejects(receipts.start('owner', request, fail));
    await assert.rejects(receipts.start('owner', request, fail));
    assert.equal(starts, 1);
    assert.equal(receipts.get('owner', request.commandId!)?.state, 'unknown');
    const records = JSON.parse(readFileSync(join(dir, 'start-receipts.json'), 'utf8'));
    records[0].state = 'pending';
    writeFileSync(join(dir, 'start-receipts.json'), JSON.stringify(records));
    const restarted = new Receipts(dir);
    await assert.rejects(restarted.start('owner', request, fail));
    assert.equal(starts, 1);
    assert.equal(restarted.get('owner', request.commandId!)?.state, 'unknown');
    const next = { ...request, commandId: '00000000-0000-4000-8000-000000000003' };
    await assert.rejects(restarted.start('owner', next, async () => { throw new DeskError('not trusted', 409, { notStarted: true, untrusted: request.cwd }); }));
    assert.equal(restarted.get('owner', next.commandId)?.state, 'failed');
    assert.equal(restarted.get('owner', next.commandId)?.untrusted, request.cwd);
  } finally { assert.ok(dir.startsWith(join(tmpdir(), 'cellar-receipts-'))); rmSync(dir, { recursive: true, force: true }); }
});
