import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readPicture, withPictures } from './pictures.ts';

const image = 'data:image/png;base64,aGVsbG8=';
const row = (id: string, lineId: string | null = null, entryId = 'entry') => ({
  id, entry_id: entryId, line_id: lineId, width: 1080, height: 2400, data: image,
});

function clientFor(rows: ReturnType<typeof row>[], failure: string | null = null): SupabaseClient {
  return { from: () => {
    const filters: Record<string, string> = {};
    const result = () => ({ data: rows.filter((r) => Object.entries(filters).every(([key, value]) => r[key as keyof typeof r] === value)), error: failure ? new Error(failure) : null });
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { filters[key] = value; return query; },
      order: async () => result(),
      single: async () => {
        const found = result();
        return { data: found.data[0], error: found.error ?? (found.data.length !== 1 ? new Error('not found') : null) };
      },
    };
    return query;
  } } as unknown as SupabaseClient;
}

describe('MCP entry pictures', () => {
  it('includes real cover and note image blocks, scoped to the entry', async () => {
    const out = await withPictures(clientFor([row('cover'), row('note', 'line'), row('other', null, 'other-entry')]), 'entry', 'brief');
    assert.equal(out.content[0].type, 'text');
    assert.deepEqual(out.content.filter((b) => b.type === 'image'), [
      { type: 'image', mimeType: 'image/png', data: 'aGVsbG8=' },
      { type: 'image', mimeType: 'image/png', data: 'aGVsbG8=' },
    ]);
    const labels = out.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    assert.match(labels, /cover/);
    assert.match(labels, /note line/);
    assert.ok(!labels.includes('other-entry'));
  });

  it('keeps an ordinary brief unchanged when no images exist', async () => {
    assert.deepEqual(await withPictures(clientFor([]), 'entry', 'brief'), { content: [{ type: 'text', text: 'brief' }] });
  });

  it('preserves a successful claim and reports image query failures', async () => {
    const out = await withPictures(clientFor([], 'permission denied'), 'entry', 'claimed');
    assert.equal(out.isError, undefined);
    assert.match(JSON.stringify(out), /claimed.*Could not load attached pictures: permission denied/);
  });

  it('rejects a picture id belonging to another entry', async () => {
    await assert.rejects(readPicture(clientFor([row('other', null, 'other-entry')]), 'entry', 'other'), /not found/);
  });

  it('refuses malformed data instead of emitting a broken image', async () => {
    await assert.rejects(readPicture(clientFor([{ ...row('bad'), data: 'https://untrusted/image' }]), 'entry', 'bad'), /invalid/);
  });

  it('bounds inline bytes and gives a tool call for every deferred picture', async () => {
    const rows = Array.from({ length: 16 }, (_, i) => ({ ...row(`picture-${i}`), data: `data:image/jpeg;base64,${'a'.repeat(440_000)}` }));
    const out = await withPictures(clientFor(rows), 'entry', 'brief');
    const images = out.content.filter((b) => b.type === 'image');
    assert.ok(images.reduce((size, b) => size + b.data.length, 0) <= 6_000_000);
    assert.equal(images.length, 13);
    assert.match(JSON.stringify(out.content.filter((b) => b.type === 'text')), /cellar_get_picture.*picture-15/);
  });
});
