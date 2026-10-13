import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { Approvals } from './approvals.ts';
import { EventStore } from './eventStore.ts';
import { claudeCanUseTool, sessionSuggestions } from './claudeRuntime.ts';
import { codexLogItem, codexPermissionRequest } from './codexApprovals.ts';
import { codexItems } from './providerItems.ts';
import { DeskHost } from './host.ts';
import type { DeskStart } from '@/lib/deskProtocol';

const input = { runId: 'abcdef01', agent: 'codex' as const, what: 'command', subject: 'echo hello', effect: 'workspace', always: null };
test('first answer wins; a dropped reply recovers without calling provider twice', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-approval-')); const events = new EventStore(join(dir, 'events.sqlite'));
  const store = new Approvals(join(dir, 'requests.sqlite'), (owner, rows) => events.approvals(owner, rows));
  let calls = 0; let release!: () => void;
  const request = store.open('owner', input, async () => { calls++; await new Promise<void>((resolve) => { release = resolve; }); });
  const answer = { commandId: randomUUID(), requestId: request.id, decision: 'allow' as const, source: 'phone' as const };
  try {
    const first = store.answer('owner', answer); assert.equal(store.get('owner', request.id)?.state, 'answering');
    const rival = await store.answer('owner', { ...answer, commandId: randomUUID(), decision: 'deny', source: 'pc' });
    assert.equal(rival.state, 'failed'); assert.equal(calls, 1);
    assert.equal((await store.answer('owner', answer)).state, 'pending');
    release(); assert.equal((await first).state, 'confirmed');
    assert.equal((await store.answer('owner', answer)).state, 'confirmed'); assert.equal(calls, 1);
    assert.equal(events.snapshot('owner', null).approvals?.[0].state, 'answered');
    assert.equal(events.snapshot('other', null).approvals, undefined);
    assert.equal(store.receipt('other', answer.commandId), null);
    await assert.rejects(store.answer('other', { ...answer, commandId: randomUUID() }), /No such approval/);
    await assert.rejects(store.answer('owner', { ...answer, decision: 'deny' }), /different choices/);
  } finally { store.close(); events.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-approval-'))); rmSync(dir, { recursive: true, force: true }); }
});
test('restart expires callbacks; uncertain delivery never replays; late live confirmation recovers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-approval-')); const path = join(dir, 'requests.sqlite'); let store = new Approvals(path);
  const pending = store.open('owner', input, async () => {});
  const unknown = store.open('owner', input, async () => { throw new Error('lost provider acknowledgment'); });
  const answer = { commandId: randomUUID(), requestId: unknown.id, decision: 'allow' as const, source: 'phone' as const };
  try {
    assert.equal((await store.answer('owner', answer)).state, 'unknown');
    store.acknowledge('owner', unknown.id); assert.equal(store.receipt('owner', answer.commandId)?.state, 'confirmed');
    const orphan = store.open('owner', input, async () => { throw new Error('unknown'); });
    const orphanAnswer = { ...answer, commandId: randomUUID(), requestId: orphan.id };
    await store.answer('owner', orphanAnswer); store.close(); store = new Approvals(path);
    assert.equal(store.get('owner', pending.id)?.state, 'expired');
    assert.equal((await store.answer('owner', orphanAnswer)).state, 'unknown');
    const refused = await store.answer('owner', { ...answer, commandId: randomUUID(), requestId: pending.id }); assert.equal(refused.state, 'failed');
  } finally { store.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-approval-'))); rmSync(dir, { recursive: true, force: true }); }
});
test('Claude callback preserves input, restricts broader grants and respects cancellation', async () => {
  const store = new Approvals(':memory:'); const start = { cwd: 'C:/project' } as DeskStart;
  const callback = claudeCanUseTool(start, 'abcdef01', 'owner', store);
  try {
    const signal = new AbortController(); const promise = callback('Bash', { command: 'npm test' }, { signal: signal.signal, toolUseID: 'tool-1', requestId: 'request-1' });
    const request = store.list('owner')[0];
    assert.equal((await store.answer('owner', { commandId: randomUUID(), requestId: request.id, decision: 'always', source: 'phone' })).state, 'failed');
    await store.answer('owner', { commandId: randomUUID(), requestId: request.id, decision: 'allow', source: 'phone' });
    assert.deepEqual(await promise, { behavior: 'allow', updatedInput: { command: 'npm test' } });
    const cancel = new AbortController(); const cancelled = callback('Write', { file_path: 'test' }, { signal: cancel.signal, toolUseID: 'tool-2', requestId: 'request-2' });
    const cancelledId = store.list('owner').find((row) => row.state === 'pending')!.id;
    cancel.abort(); assert.equal((await cancelled)?.behavior, 'deny'); assert.equal(store.get('owner', cancelledId)?.state, 'expired');
    const suggestions = [{ type: 'addRules' as const, behavior: 'allow' as const, destination: 'session' as const, rules: [{ toolName: 'Bash', ruleContent: 'npm test' }] }];
    const broader = callback('Bash', { command: 'npm test' }, { signal: signal.signal, toolUseID: 'tool-3', requestId: 'request-3', suggestions });
    const matching = store.list('owner').find((row) => row.state === 'pending')!;
    await store.answer('owner', { commandId: randomUUID(), requestId: matching.id, decision: 'always', source: 'pc' });
    assert.deepEqual(await broader, { behavior: 'allow', updatedInput: { command: 'npm test' }, updatedPermissions: suggestions });
    assert.deepEqual(sessionSuggestions([{ type: 'setMode', mode: 'bypassPermissions', destination: 'session' }, { type: 'addRules', behavior: 'allow', destination: 'userSettings', rules: [] }]), []);
  } finally { store.close(); }
});
test('Codex permissions map exact provider scopes and network context', () => {
  const params = { threadId: 't', turnId: 'turn', itemId: 'i', command: 'npm test' };
  const command = codexPermissionRequest({ method: 'item/commandExecution/requestApproval', params }, 'C:/project')!;
  assert.deepEqual(command.response('always'), { decision: 'acceptForSession' });
  const network = codexPermissionRequest({ method: 'item/commandExecution/requestApproval', params: { ...params, networkApprovalContext: { host: 'example.org', protocol: 'https' }, availableDecisions: ['accept', 'decline'] } }, 'C:/project')!;
  assert.equal(network.what, 'access network'); assert.equal(network.always, null);
  const permissions = { network: { enabled: true } };
  const grant = codexPermissionRequest({ method: 'item/permissions/requestApproval', params: { ...params, permissions } }, 'C:/project')!;
  assert.deepEqual(grant.response('deny'), { permissions: {}, scope: 'turn' });
  assert.deepEqual(grant.response('allow'), { permissions, scope: 'turn' });
  assert.deepEqual(grant.response('always'), { permissions, scope: 'session' });
  assert.throws(() => codexPermissionRequest({ method: 'item/permissions/requestApproval', params }, 'C:/project'), /permission profile/);
  assert.deepEqual(codexItems({ type: 'item.completed', item: codexLogItem({ id: 'prompt', type: 'userMessage' }) }, 'fixture'), []);
  assert.equal(codexItems({ type: 'item.completed', item: codexLogItem({ id: 'denied', type: 'commandExecution', status: 'declined' }) }, 'fixture')[0].status, 'failed');
});
test('desktop bridge uses the same first-answer claim and owns PC attribution', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-approval-host-'));
  const host = new DeskHost({ dataDir: dir, version: 'test', supabaseUrl: '', supabaseAnonKey: '', frames: null });
  host.setSession({ userId: 'owner', accessToken: 'test' }); let calls = 0;
  try {
    const request = host.deps.approvals!.open('owner', input, async () => { calls++; });
    const answer = { commandId: randomUUID(), requestId: request.id, decision: 'deny', source: 'phone' };
    const result = await host.request({ method: 'POST', path: '/approval-answers', body: answer });
    const receipt = (result.body as any).receipt; assert.equal(receipt.state, 'confirmed'); assert.equal(receipt.request.source, 'pc');
    assert.equal((await host.deps.approvals!.answer('owner', { ...answer, commandId: randomUUID(), decision: 'allow' })).state, 'failed'); assert.equal(calls, 1);
  } finally { await host.stop(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-approval-host-'))); rmSync(dir, { recursive: true, force: true }); }
});
