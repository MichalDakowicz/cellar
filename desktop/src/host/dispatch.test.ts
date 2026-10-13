import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { DeskStart } from '@/lib/deskProtocol';
import type { RunControl } from '@/lib/deskDispatch';
import type { ManagedRuns } from './managedRuns.ts';
import type { ManagedSession } from './managedSession.ts';
import { ControlStore } from './controlStore.ts';
import { Dispatch } from './dispatch.ts';
import { dispatchCommand } from './dispatchCommand.ts';
import type { HostDeps } from './api.ts';

function fixture(store = new ControlStore(':memory:')) {
  let busy = true; let available = true; let failSend = false; let failInterrupt = false;
  const calls: string[] = [];
  const session: ManagedSession = { busy: () => busy,
    send: async (text) => { calls.push(text); if (failSend) throw Error('reply missing'); busy = true; },
    interrupt: async () => { calls.push('interrupt'); if (failInterrupt) throw Error('not confirmed'); busy = false; },
    stop: async () => { busy = false; available = false; }, close: async () => { available = false; } };
  const runtime = { get: (owner: string, id: string) => available && owner === 'owner' && id === 'abcdef01' ? { session, start: { agent: 'codex', mode: 'ask' } as DeskStart } : null,
    onIdle: (_owner: string, _id: string) => {} };
  const dispatch = new Dispatch(store, runtime as unknown as ManagedRuns);
  const input = (action: RunControl['action'], extra: Partial<RunControl> = {}): RunControl => ({ commandId: randomUUID(), runId: 'abcdef01', action, source: 'phone', ...extra });
  const idle = async () => { busy = false; runtime.onIdle('owner', 'abcdef01'); await dispatch.serial('abcdef01', async () => {}); };
  return { store, dispatch, input, calls, session, idle, failSend: () => { failSend = true; }, failInterrupt: () => { failInterrupt = true; } };
}
test('busy Send persists FIFO; duplicate IDs and conflicting edits cannot duplicate delivery', async () => {
  const f = fixture();
  try {
    const first = f.input('send', { text: 'first' }); const second = f.input('send', { text: 'second' });
    assert.equal((await f.dispatch.action('owner', first)).item?.state, 'queued');
    await f.dispatch.action('owner', second);
    assert.equal((await f.dispatch.action('owner', first)).state, 'confirmed'); assert.deepEqual(f.calls, []);
    await assert.rejects(f.dispatch.action('owner', { ...first, text: 'changed' }), /another action/);
    const edit = f.input('edit', { itemId: second.commandId, revision: 0, text: 'edited' });
    assert.equal((await f.dispatch.action('owner', edit)).item?.revision, 1);
    assert.equal((await f.dispatch.action('owner', { ...edit, commandId: randomUUID(), text: 'stale' })).state, 'failed');
    await f.idle(); assert.deepEqual(f.calls, ['first']);
    await f.idle(); assert.deepEqual(f.calls, ['first', 'edited']);
    await f.dispatch.action('owner', first); assert.equal(f.calls.length, 2);
  } finally { f.store.close(); }
});
test('Send now waits for interruption; ambiguous promotion stays visible and never replays', async () => {
  const f = fixture();
  try {
    const send = f.input('send', { text: 'replacement' }); await f.dispatch.action('owner', send);
    const promote = f.input('promote', { itemId: send.commandId, revision: 0 });
    f.failSend(); const receipt = await f.dispatch.action('owner', promote);
    assert.equal(receipt.state, 'unknown'); assert.deepEqual(f.calls, ['interrupt', 'replacement']);
    assert.equal(f.dispatch.queue('owner', 'abcdef01').items[0].state, 'unknown');
    await f.dispatch.action('owner', promote); await f.idle(); assert.equal(f.calls.length, 2);
  } finally { f.store.close(); }
});
test('rejected interruption does not send replacement; stale cancellation retains original item', async () => {
  const f = fixture();
  try {
    const send = f.input('send', { text: 'queued' }); await f.dispatch.action('owner', send);
    assert.equal((await f.dispatch.action('owner', f.input('cancel', { itemId: send.commandId, revision: 1 }))).state, 'failed');
    assert.equal(f.dispatch.queue('owner', 'abcdef01').items.length, 1);
    f.failInterrupt(); assert.equal((await f.dispatch.action('owner', f.input('promote', { itemId: send.commandId, revision: 0 }))).state, 'unknown');
    assert.deepEqual(f.calls, ['interrupt']);
  } finally { f.store.close(); }
});
test('confirmed cancel/stop remove only queued items; restart keeps uncertain work without replay', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-w9-store-')); const path = join(dir, 'controls.sqlite');
  let f = fixture(new ControlStore(path));
  try {
    const first = f.input('send', { text: 'cancel me' }); const second = f.input('send', { text: 'keep' });
    await f.dispatch.action('owner', first); await f.dispatch.action('owner', second);
    assert.equal((await f.dispatch.action('owner', f.input('cancel', { itemId: first.commandId, revision: 0 }))).state, 'confirmed');
    assert.equal(f.dispatch.queue('owner', 'abcdef01').items.length, 1);
    const pending = f.input('stop'); f.store.begin('owner', pending);
    f.store.close(); f = fixture(new ControlStore(path));
    assert.equal(f.store.receipt('owner', pending.commandId)?.state, 'unknown');
    assert.equal(f.dispatch.queue('owner', 'abcdef01').items[0].state, 'unknown');
    await f.idle(); assert.deepEqual(f.calls, []);
    assert.equal(f.store.receipt('other', first.commandId), null); assert.deepEqual(f.dispatch.queue('other', 'abcdef01').items, []);
  } finally { f.store.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-w9-store-'))); rmSync(dir, { recursive: true, force: true }); }
});
test('commands start at actual dispatch, in the saved workspace, never at queue acceptance', async () => {
  const f = fixture(); let jobs = 0;
  try {
    const deps = { commands: { plan: async () => ({ cwd: 'C:/main', gradle: 'C:/main/android', steps: [] }) },
      jobs: { start: async (plan: { cwd: string; gradle: string }, command: string, parent: string) => {
        jobs++; assert.equal(plan.cwd, 'C:/worktree'); assert.match(plan.gradle.replaceAll('\\', '/'), /worktree\/android$/); assert.equal(command, 'apk'); assert.equal(parent, 'abcdef01'); return { id: 'job' };
      } } } as unknown as HostDeps;
    const item = (await f.dispatch.action('owner', f.input('send', { text: '$apk' }))).item!;
    assert.equal(jobs, 0);
    const text = await dispatchCommand(deps, item, { cwd: 'C:/worktree', projectId: 'project' } as DeskStart);
    assert.equal(jobs, 1); assert.match(text, /result is pending/);
  } finally { f.store.close(); }
});
