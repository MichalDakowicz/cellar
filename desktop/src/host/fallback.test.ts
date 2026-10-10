import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { HostDeps } from './api.ts';
import { CellarFallback } from './fallback.ts';

test('heartbeat retains every host run so remote waiting counts are not truncated at twenty', async () => {
  const runs = Array.from({ length: 25 }, (_, index) => ({
    id: String(index), agent: 'codex', name: 'work', cwd: 'C:/project', startedAt: index,
    state: index === 24 ? 'waiting' : 'running', origin: 'phone', entryId: null,
  }));
  let written: { runs: unknown[] } | null = null;
  const client = {
    from: (table: string) => table === 'cellar_desks'
      ? { upsert: async (row: { runs: unknown[] }) => { written = row; return { error: null }; } }
      : { select: () => ({ eq: () => ({ eq: () => ({ order: async () => ({ error: null, data: [] }) }) }) }) },
  };
  const deps = {
    account: { current: null, onChange: () => {}, client: () => client },
    identity: () => ({ id: 'pc', name: 'pc', port: 47821 }),
    runs: { list: async () => runs }, lanHost: () => '127.0.0.1', version: 'test',
  } as unknown as HostDeps;
  const fallback = new CellarFallback(deps);
  fallback.status = 'on';
  await fallback.tick();
  assert.ok(written);
  assert.equal((written as { runs: unknown[] }).runs.length, 25);
  assert.ok((written as { runs: { id: string }[] }).runs.some((run) => run.id === runs[24].id));
});

test('a failed run poll preserves heartbeat age and still reads the mailbox', async () => {
  let heartbeats = 0;
  let mailboxReads = 0;
  const client = {
    from: (table: string) => table === 'cellar_desks'
      ? { upsert: async () => { heartbeats++; return { error: null }; } }
      : { select: () => ({ eq: () => ({ eq: () => ({ order: async () => {
        mailboxReads++;
        return { error: null, data: [] };
      } }) }) }) },
  };
  const deps = {
    account: { current: null, onChange: () => {}, client: () => client },
    identity: () => ({ id: 'pc', name: 'pc', port: 47821 }),
    runs: { list: async () => { throw new Error('agent read failed'); } },
    lanHost: () => '127.0.0.1', version: 'test',
  } as unknown as HostDeps;
  const fallback = new CellarFallback(deps);
  fallback.status = 'on';
  await fallback.tick();
  assert.equal(heartbeats, 0);
  assert.equal(mailboxReads, 1);
});
