import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { WorktreeReceipts } from './worktreeReceipts.ts';
import { worktreeFixture } from './worktreeFixture.ts';

test('lifecycle receipts distinguish preflight refusal, uncertain effects, restart and owner', async () => {
  const f = await worktreeFixture();
  const receipts = new WorktreeReceipts(f.data);
  const request = { commandId: randomUUID(), worktreeId: f.request.worktreeId!, action: 'keep' as const, token: 'a'.repeat(64) };
  try {
    assert.equal((await receipts.execute('owner', request, async () => { throw new Error('preflight'); })).state, 'failed');
    const next = { ...request, commandId: randomUUID() };
    let calls = 0;
    const work = async (mutating: () => void): Promise<never> => { calls++; mutating(); throw new Error('effect reply lost'); };
    assert.equal((await receipts.execute('owner', next, work)).state, 'unknown');
    assert.equal((await receipts.execute('owner', next, work)).state, 'unknown'); assert.equal(calls, 1);
    assert.equal(receipts.get('other', next.commandId), null);
    await assert.rejects(receipts.execute('owner', { ...next, token: 'b'.repeat(64) }, work), /another worktree action/);
    const rows = JSON.parse(readFileSync(join(f.data, 'worktree-receipts.json'), 'utf8'));
    rows[1].state = 'pending'; writeFileSync(join(f.data, 'worktree-receipts.json'), JSON.stringify(rows));
    const restarted = new WorktreeReceipts(f.data);
    assert.equal((await restarted.execute('owner', next, work)).state, 'unknown'); assert.equal(calls, 1);
  } finally { await f.dispose(); }
});
