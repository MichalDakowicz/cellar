import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { deskCounts } from '@/lib/deskCounts';
import { readDeskRuns } from '@/lib/deskRunSnapshot';
import { signDeskRequest } from '@/lib/deskSign';

import type { HostDeps } from './api.ts';
import type { ClaudeAgentRow } from './agents.ts';
import { DeskError } from './claudeRuns.ts';
import { lanServer } from './http.ts';
import { Runs } from './runs.ts';

test('signed phone reads confirmed host states; a failed poll hides cached totals; retry recovers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-counts-'));
  const startedAt = Date.now();
  writeFileSync(join(dir, 'runs.json'), JSON.stringify([
    { id: 'abcdef01', agent: 'claude', name: 'blocked', cwd: dir, startedAt, entryId: null },
    { id: 'abcdef02', agent: 'claude', name: 'working', cwd: dir, startedAt, entryId: null },
  ]));
  let failed = false;
  let resolved = false;
  const runs = new Runs(dir, async (): Promise<ClaudeAgentRow[]> => {
    if (failed) throw new DeskError('claude agents did not answer', 502);
    return [
      { id: 'abcdef01', sessionId: 'one', cwd: dir, startedAt, kind: 'background', state: resolved ? 'running' : 'blocked' },
      { id: 'abcdef02', sessionId: 'two', cwd: dir, startedAt, kind: 'background', state: 'running' },
      { id: 'abcdef03', sessionId: 'three', cwd: dir, startedAt, kind: 'interactive', status: 'idle' },
    ];
  });
  const key = randomBytes(24).toString('base64url');
  const deps = { identity: () => ({ key }), runs } as unknown as HostDeps;
  const server = lanServer(deps, null);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  const read = async () => {
    const authorization = await signDeskRequest({
      key, method: 'GET', path: '/runs', body: '', ts: Date.now(), nonce: randomBytes(16).toString('hex'),
      sha256: async (data) => new Uint8Array(createHash('sha256').update(data).digest()),
    });
    return fetch(`http://127.0.0.1:${port}/runs`, { headers: { authorization } });
  };
  const input = { via: 'lan' as const, entriesState: 'ready' as const, entries: [{ id: 'question', state: 'blocked' as const, archived: false }], snapshotAt: null };
  try {
    const first = await read();
    assert.equal(first.status, 200);
    const cached = readDeskRuns(((await first.json()) as { runs: unknown }).runs)!;
    assert.deepEqual(deskCounts({ ...input, runs: cached, runsState: 'ready' }), {
      state: 'ready', working: 1, waiting: 3, waitingRuns: 2, blockedEntries: 1, snapshotAt: null,
    });
    failed = true;
    const error = await read();
    assert.equal(error.status, 502);
    assert.equal(((await error.json()) as { error: string }).error, 'claude agents did not answer');
    assert.equal(deskCounts({ ...input, runs: cached, runsState: 'failed' }).waiting, null);
    failed = false;
    resolved = true;
    const retry = await read();
    assert.equal(retry.status, 200);
    assert.equal(deskCounts({ ...input, runs: readDeskRuns(((await retry.json()) as { runs: unknown }).runs)!, runsState: 'ready' }).waiting, 2);
    const unsigned = await fetch(`http://127.0.0.1:${port}/runs`);
    assert.equal(unsigned.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    assert.ok(dir.startsWith(join(tmpdir(), 'cellar-counts-')));
    rmSync(dir, { recursive: true, force: true });
  }
});
