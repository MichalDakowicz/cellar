import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { signDeskRequest } from '@/lib/deskSign';
import { EMPTY_STREAM, readStreamMessage, reduceStream } from '@/lib/deskEvents';
import type { DeskStart } from '@/lib/deskProtocol';
import type { HostDeps } from './api.ts';
import { Approvals } from './approvals.ts';
import { EventStore } from './eventStore.ts';
import { lanServer } from './http.ts';
import { Tickets } from './tickets.ts';
import { startCodex } from './codexRuntime.ts';

async function until(check: () => boolean) {
  const end = Date.now() + 5000;
  while (!check()) { if (Date.now() > end) throw Error('approval flow timeout'); await new Promise((resolve) => setTimeout(resolve, 10)); }
}
test('signed phone approval feed and receipt recovery bind account and transport source', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-approval-flow-'));
  const events = new EventStore(join(dir, 'events.sqlite'));
  const approvals = new Approvals(join(dir, 'approvals.sqlite'), (owner, rows) => events.approvals(owner, rows));
  const key = randomBytes(24).toString('base64url'); let owner = 'owner'; let calls = 0;
  const request = approvals.open(owner, { runId: 'abcdef01', agent: 'codex', what: 'run command', subject: 'echo yes', effect: dir, always: null }, async () => { calls++; });
  events.catalog(owner, []);
  const deps = { identity: () => ({ key, port }), account: { get current() { return { userId: owner }; } }, approvals,
    lanHost: () => '127.0.0.1', tickets: new Tickets(), events: { store: events, refresh: async () => {}, error: null } } as unknown as HostDeps;
  const server = lanServer(deps, null); await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port; let socket: WebSocket | undefined;
  const send = async (method: string, path: string, raw?: unknown) => {
    const body = raw ? JSON.stringify(raw) : '';
    const authorization = await signDeskRequest({ key, method, path, body, ts: Date.now(), nonce: randomBytes(16).toString('hex'),
      sha256: async (data) => new Uint8Array(createHash('sha256').update(data).digest()) });
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: { authorization }, ...(body ? { body } : {}) });
    return { status: res.status, body: await res.json() as any };
  };
  try {
    const ticket = await send('POST', '/event-ticket'); socket = new WebSocket(ticket.body.url); let state = { ...EMPTY_STREAM };
    socket.on('message', (data) => { const message = readStreamMessage(JSON.parse(data.toString())); assert.ok(message); state = reduceStream(state, message); });
    await new Promise<void>((resolve, reject) => { socket!.once('open', resolve); socket!.once('error', reject); });
    socket.send(JSON.stringify({ type: 'subscribe', runId: null, approvals: true, afterSequence: 0, epoch: '' }));
    await until(() => state.phase === 'live'); assert.equal(state.approvals?.[0].id, request.id);
    const answer = { commandId: randomUUID(), requestId: request.id, decision: 'deny', source: 'pc' };
    assert.equal((await send('POST', '/approval-answers', answer)).body.receipt.state, 'confirmed');
    await until(() => state.approvals?.[0].state === 'answered'); assert.equal(state.approvals?.[0].source, 'phone');
    // The first POST response can be lost; recovery returns its original durable result.
    const recovered = await send('GET', `/approval-answers/${answer.commandId}`);
    assert.equal(recovered.body.receipt.request.decision, 'deny');
    assert.equal((await send('POST', '/approval-answers', answer)).body.receipt.state, 'confirmed'); assert.equal(calls, 1);
    const conflicting = await send('POST', '/approval-answers', { ...answer, commandId: randomUUID(), decision: 'allow' });
    assert.equal(conflicting.body.receipt.state, 'failed'); assert.equal(calls, 1);
    owner = 'other'; assert.equal((await send('GET', `/approval-answers/${answer.commandId}`)).body.receipt, null);
    assert.equal((await send('POST', '/approval-answers', { ...answer, commandId: randomUUID() })).status, 404);
  } finally {
    socket?.terminate(); await new Promise<void>((resolve) => server.close(() => resolve())); approvals.close(); events.close();
    assert.ok(dir.startsWith(join(tmpdir(), 'cellar-approval-flow-'))); rmSync(dir, { recursive: true, force: true });
  }
});

test('Codex stdio fixture confirms real request IDs, exact scopes, item outcomes and interruption', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-codex-fixture-')); const approvals = new Approvals(':memory:');
  // Node stands in for Codex. This never launches Claude or uses a provider account.
  writeFileSync(join(dir, 'app-server'), `
const readline = require('node:readline');
const send = row => process.stdout.write(JSON.stringify(row) + '\\n');
let index = 0, policy;
const ask = () => {
  const type = ['commandExecution','fileChange','permissions'][index];
  if (!type) return send({method:'turn/completed',params:{turn:{id:'turn',status:'completed'}}});
  send({method:'item/started',params:{item:{id:'item-'+index,type,status:'inProgress',command:'echo fixture',changes:[{path:'fixture.txt',diff:'+hello'}]}}});
  send({id:'request-'+index,method:'item/'+type+'/requestApproval',params:{threadId:'thread',turnId:'turn',itemId:'item-'+index,command:'echo fixture',permissions:{network:{enabled:true}}}});
};
readline.createInterface({input:process.stdin}).on('line', text => {
  const row = JSON.parse(text);
  if (row.method === 'initialize') return send({id:row.id,result:{}});
  if (row.method === 'thread/start') { policy=row.params; return send({id:row.id,result:{thread:{id:'thread'}}}); }
  if (row.method === 'turn/start') { send({id:row.id,result:{turn:{id:'turn'}}}); send({method:'item/started',params:{item:{id:'config',type:'agentMessage',text:JSON.stringify(policy)}}}); return setTimeout(ask,0); }
  if (row.method === 'turn/interrupt') { send({id:row.id,result:{}}); return send({method:'turn/completed',params:{turn:{id:'turn',status:'interrupted'}}}); }
  if (row.id && row.result) {
    send({method:'serverRequest/resolved',params:{threadId:'thread',requestId:row.id}});
    send({method:'item/completed',params:{item:{id:'item-'+index,type:['commandExecution','fileChange','permissions'][index],command:'echo fixture',status:row.result.decision==='decline'?'declined':'completed',aggregatedOutput:JSON.stringify(row.result)}}});
    index++; setTimeout(ask,0);
  }
});`);
  const rows: any[] = []; let code: number | null | undefined; let session: Awaited<ReturnType<typeof startCodex>> | undefined;
  const start = { cwd: dir, agent: 'codex', prompt: 'fixture', mode: 'ask' } as DeskStart;
  try {
    session = await startCodex(process.execPath, start, 'abcdef01', 'owner', approvals, process.env, (row) => rows.push(row), (value) => { code = value; });
    for (const decision of ['deny', 'allow', 'always'] as const) {
      await until(() => approvals.list('owner').some((row) => row.state === 'pending'));
      const request = approvals.list('owner').find((row) => row.state === 'pending')!;
      if (decision === 'allow') assert.match(request.subject, /fixture.txt/);
      assert.equal((await approvals.answer('owner', { commandId: randomUUID(), requestId: request.id, decision, source: 'phone' })).state, 'confirmed');
    }
    await until(() => code !== undefined); assert.equal(code, 0);
    const configuration = JSON.parse(rows.find((row) => row.item?.id === 'config').item.text);
    assert.equal(configuration.sandbox, 'read-only'); assert.equal(configuration.approvalsReviewer, 'user'); assert.equal(configuration.approvalPolicy, 'untrusted');
    const completed = rows.filter((row) => row.type === 'item.completed'); assert.equal(completed[0].item.status, 'declined');
    assert.deepEqual(JSON.parse(completed[2].item.aggregated_output), { permissions: { network: { enabled: true } }, scope: 'session' });
    await session.close();
    code = undefined; session = await startCodex(process.execPath, start, 'abcdef02', 'owner', approvals, process.env, () => {}, (value) => { code = value; });
    await until(() => approvals.list('owner').some((row) => row.runId === 'abcdef02' && row.state === 'pending'));
    await session.stop(); assert.equal(code, null);
    assert.equal(approvals.list('owner').find((row) => row.runId === 'abcdef02')?.state, 'expired');
  } finally {
    await session?.close(); approvals.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-codex-fixture-')));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
