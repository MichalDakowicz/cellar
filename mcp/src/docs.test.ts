import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { attachDoc } from './docs.ts';
import { entry } from './fixtures.test-helpers.ts';

describe('MCP attachDoc', () => {
  it('writes a normalized path and optional label under the signed-in owner', async () => {
    let inserted: unknown;
    const client = { from: (table: string) => {
      assert.equal(table, 'cellar_entry_docs');
      return { insert: (value: object) => {
        inserted = value;
        return { select: () => ({ single: async () => ({ data: { id: 'doc', ...value, created_at: 'now' }, error: null }) }) };
      } };
    } } as unknown as SupabaseClient;
    const out = await attachDoc(client, 'owner', entry(), { ref: ' "docs/Design.md" ', label: ' design ' });
    assert.deepEqual(inserted, { user_id: 'owner', entry_id: entry().id, ref: 'docs/Design.md', label: 'design' });
    assert.equal(out.added, true);
    assert.equal(out.doc.createdAt, 'now');
  });

  it('returns an existing reference without writing a duplicate', async () => {
    const doc = { id: 'doc', ref: 'https://example.com/Design', label: null, createdAt: 'now' };
    const out = await attachDoc({} as SupabaseClient, 'owner', entry({ docs: [doc] }), { ref: ' https://example.com/Design ' });
    assert.deepEqual(out, { doc, added: false });
  });

  it('rejects references that become empty after normalization', async () => {
    await assert.rejects(attachDoc({} as SupabaseClient, 'owner', entry(), { ref: '"  "' }), /required/);
  });

  it('surfaces a failed insert instead of reporting success', async () => {
    const client = { from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ error: new Error('permission denied') }) }) }) }) } as unknown as SupabaseClient;
    await assert.rejects(attachDoc(client, 'owner', entry(), { ref: 'docs/read.md' }), /permission denied/);
  });
});
