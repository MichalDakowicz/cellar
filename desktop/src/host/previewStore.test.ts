import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { PreviewStore } from './previewStore.ts';
import { serverArgs } from './previews.ts';
import type { ManagedPreview, PreviewAction } from '@/lib/deskManagedPreview';

test('preview receipts dedupe concurrent/lost replies, isolate owners and refuse restart replay', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-preview-'));
  try {
    const store = new PreviewStore(dir);
    const action: PreviewAction = { commandId: '11111111-1111-4111-8111-111111111111', projectId: '22222222-2222-4222-8222-222222222222', runId: 'abcdef12', action: 'deploy' };
    let starts = 0;
    const work = async () => { starts++; return { id: 'preview', port: 1234 } as ManagedPreview; };
    const [first, retry] = await Promise.all([store.act('me', action, work), store.act('me', action, work)]);
    assert.deepEqual(first, retry); assert.equal(starts, 1);
    assert.equal(store.receipt('other', action.commandId), null);
    assert.throws(() => store.act('me', { ...action, action: 'checks' }, work), /another action/);
    const pending = { ...action, commandId: '33333333-3333-4333-8333-333333333333' };
    void store.act('me', pending, () => new Promise(() => {}));
    const restart = new PreviewStore(dir);
    assert.equal((await restart.act('me', pending, work)).state, 'unknown');
    assert.equal(starts, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('allocated preview ports are explicit; Vite cannot fall back', () => {
  assert.deepEqual(serverArgs('vite', 12345), ['--host', '127.0.0.1', '--port', '12345', '--strictPort']);
  assert.deepEqual(serverArgs('next dev', 12345), ['--hostname', '127.0.0.1', '--port', '12345']);
  assert.throws(() => serverArgs('node arbitrary.js', 12345), /supports/);
});
