import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Approvals } from './approvals.ts';
import { startCodex } from './codexRuntime.ts';
import type { DeskStart } from '@/lib/deskProtocol';

test('Codex checkpoint forks through exact completed turn and later sends use confirmed fork', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-provider-checkpoint-')); const approvals = new Approvals(':memory:');
  writeFileSync(join(dir, 'app-server'), `
const rl=require('node:readline').createInterface({input:process.stdin});const fs=require('node:fs');
const send=x=>process.stdout.write(JSON.stringify(x)+'\\n');let turn=0,thread=0;
rl.on('line',line=>{const r=JSON.parse(line);fs.appendFileSync('calls.jsonl',line+'\\n');
if(r.method==='initialize')send({id:r.id,result:{}});
if(r.method==='thread/start'||r.method==='thread/fork')send({id:r.id,result:{thread:{id:'thread'+(++thread)}}});
if(r.method==='turn/start'){turn++;send({id:r.id,result:{turn:{id:'turn'+turn}}});send({method:'turn/completed',params:{turn:{id:'turn'+turn,status:'completed'}}});}
if(r.method==='account/rateLimits/read')send({id:r.id,result:{rateLimits:{primary:{usedPercent:30,windowDurationMins:300,resetsAt:10}}}});
if(r.method==='thread/compact/start'){send({id:r.id,result:{}});send({method:'thread/compacted',params:{threadId:r.params.threadId}});}
});`);
  const changes: unknown[] = [];
  const session = await startCodex(process.execPath, { agent: 'codex', cwd: dir, prompt: 'first', mode: 'ask' } as DeskStart, 'abcdef01', 'owner', approvals, process.env, () => {}, () => {}, (code, maintenance) => changes.push([code, maintenance]));
  const idle = async () => { const end = Date.now() + 3000; while (session.busy()) { if (Date.now() > end) throw new Error('provider timeout'); await new Promise((r) => setTimeout(r, 10)); } };
  try {
    await idle(); const first = session.point!(); assert.equal(first.anchor, 'turn1');
    await session.send('second', 'second'); await idle();
    await session.rollback!(first); assert.equal(session.point!().turns, 1); assert.equal(session.point!().sessionId, 'thread2');
    await session.send('after restore', 'third'); await idle();
    const calls = readFileSync(join(dir, 'calls.jsonl'), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(calls.find((r) => r.method === 'thread/fork').params.lastTurnId, 'turn1');
    assert.equal(calls.filter((r) => r.method === 'turn/start').at(-1).params.threadId, 'thread2');
    assert.ok(!calls.some((r) => r.method === 'thread/rollback'));
    assert.ok(await session.usage!());
    await session.compact!(); await idle(); assert.deepEqual(changes.at(-1), [0, true]);
  } finally { await session.close(); approvals.close(); rmSync(dir, { recursive: true, force: true }); }
});
