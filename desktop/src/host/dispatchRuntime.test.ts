import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { DeskStart } from '@/lib/deskProtocol';
import type { SDKMessage, SDKUserMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { Approvals } from './approvals.ts';
import { startCodex } from './codexRuntime.ts';
import { startClaudeSdk } from './claudeRuntime.ts';

async function until(check: () => boolean) {
  const end = Date.now() + 5000;
  while (!check()) { if (Date.now() > end) throw Error('dispatch fixture timeout'); await new Promise((resolve) => setTimeout(resolve, 10)); }
}
class Mailbox<T> implements AsyncIterable<T> {
  private values: T[] = []; private wake: (() => void) | null = null; private ended = false;
  push(value: T) { this.values.push(value); this.wake?.(); }
  close() { this.ended = true; this.wake?.(); }
  async *[Symbol.asyncIterator]() { while (!this.ended) { const row = this.values.shift(); if (row) yield row; else await new Promise<void>((resolve) => { this.wake = resolve; }); } }
}
test('Claude SDK streaming fixture retains one chat, confirms echoed UUIDs and interrupts before replacement', async () => {
  const approvals = new Approvals(':memory:'); const output = new Mailbox<SDKMessage>(); const received: SDKUserMessage[] = [];
  const rows: any[] = []; const turns: (number | null | undefined)[] = []; let closed = false; let interrupted = 0; let pump: Promise<void>;
  const result = (uuid?: string) => output.push({ type: 'result', is_error: false, user_message_uuid: uuid } as SDKMessage);
  const fakeQuery = ((options: Parameters<typeof query>[0]) => {
    assert.notEqual(typeof options.prompt, 'string'); assert.equal(options.options?.permissionMode, 'default');
    pump = (async () => { for await (const row of options.prompt as AsyncIterable<SDKUserMessage>) {
      received.push(row);
      if (received.length > 1 && row.message.content !== 'hold') result(row.uuid);
      else if (row.message.content === 'hold') output.push({ type: 'stream_event', user_message_uuid: row.uuid } as SDKMessage);
    } })();
    return { ...output, [Symbol.asyncIterator]: () => output[Symbol.asyncIterator](),
      interrupt: async () => { interrupted++; result(); }, close: () => { closed = true; output.close(); } };
  }) as unknown as typeof query;
  const session = await startClaudeSdk('never-launched', { agent: 'claude', prompt: 'first', mode: 'ask', cwd: 'unused' } as DeskStart,
    'abcdef01', 'owner', approvals, {}, (row) => rows.push(row), () => {}, (code) => turns.push(code), { query: fakeQuery, spawned: Promise.resolve() });
  try {
    await until(() => received.length === 1); assert.equal(session.busy(), true);
    result(); await until(() => !session.busy()); assert.equal(closed, false);
    const id = randomUUID(); await session.send('second', id);
    assert.equal(received[1].uuid, id); assert.equal(received[1].message.content, 'second');
    assert.equal(rows.filter((row) => row.type === 'cellar.message').length, 1);
    await session.send('hold', randomUUID()); assert.equal(session.busy(), true);
    await session.interrupt(); assert.equal(interrupted, 1); assert.equal(session.busy(), false); assert.equal(closed, false);
    await session.send('replacement', randomUUID()); await until(() => !session.busy());
    await session.interrupt(); assert.equal(interrupted, 1); // Idle interruption needs no control call.
    assert.ok(turns.includes(0));
  } finally { await session.close(); await pump!; approvals.close(); }
});
test('Codex stdio fixture keeps thread between turns and confirms interruption without closing chat', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-w9-codex-')); const approvals = new Approvals(':memory:');
  writeFileSync(join(dir, 'app-server'), `
const rl=require('node:readline').createInterface({input:process.stdin});
const {spawn}=require('node:child_process'); const {writeFileSync}=require('node:fs');
const send=x=>process.stdout.write(JSON.stringify(x)+'\\n'); let turn=0;
rl.on('line',line=>{const r=JSON.parse(line);
if(r.method==='initialize')send({id:r.id,result:{}});
if(r.method==='thread/start'||r.method==='thread/resume')send({id:r.id,result:{thread:{id:'same-thread'}}});
if(r.method==='turn/start'){if(r.params.threadId!=='same-thread')throw Error('wrong thread'); turn++;
send({id:r.id,result:{turn:{id:'turn'+turn}}}); send({method:'turn/started',params:{turn:{id:'turn'+turn}}});
const text=r.params.input[0].text;
if(text==='hold'){const child=spawn(process.execPath,['-e','setTimeout(()=>{},60000)'],{stdio:'ignore'});writeFileSync('child.pid',String(child.pid));}
send({method:'item/completed',params:{item:{id:'reply'+turn,type:'agentMessage',text}}});
if(text!=='hold')send({method:'turn/completed',params:{turn:{id:'turn'+turn,status:'completed'}}});}
if(r.method==='turn/interrupt'){send({id:r.id,result:{}});send({method:'turn/completed',params:{turn:{id:'turn'+turn,status:'interrupted'}}});}});`);
  const rows: any[] = []; let exited = false;
  const session = await startCodex(process.execPath, { cwd: dir, agent: 'codex', prompt: 'hold', mode: 'ask' } as DeskStart,
    'abcdef01', 'owner', approvals, process.env, (row) => rows.push(row), () => { exited = true; });
  try {
    await until(() => { try { return !!readFileSync(join(dir, 'child.pid'), 'utf8'); } catch { return false; } });
    const childPid = Number(readFileSync(join(dir, 'child.pid'), 'utf8'));
    await session.interrupt(); assert.equal(exited, false); assert.equal(session.busy(), false);
    assert.throws(() => process.kill(childPid, 0), /ESRCH/);
    await session.send('replacement', randomUUID()); await until(() => !session.busy());
    assert.equal(exited, false); assert.equal(rows.filter((row) => row.type === 'cellar.message').length, 1);
    await session.send('continue', randomUUID()); await until(() => !session.busy());
    assert.equal(rows.filter((row) => row.type === 'cellar.message').length, 2);
  } finally { await session.close(); approvals.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-w9-codex-'))); rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
});
