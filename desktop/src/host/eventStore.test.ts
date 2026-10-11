import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DeskRun } from '@/lib/deskProtocol';
import { EventStore } from './eventStore.ts';
import { ingestSource } from './eventIngest.ts';
import { claudeItems } from './providerItems.ts';

const run: DeskRun = { id: 'abcdef01', agent: 'codex', name: 'test', cwd: '.', state: 'running', origin: 'phone', startedAt: 0, entryId: null };
test('durable cursors, tools and numbered owner-scoped events survive restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-events-')); const file = join(dir, 'raw.jsonl');
  let store = new EventStore(join(dir, 'events.sqlite'));
  const first = JSON.stringify({ type: 'item.started', item: { id: 'cmd', type: 'command_execution', command: 'test' } });
  const done = JSON.stringify({ type: 'item.completed', item: { id: 'cmd', type: 'command_execution', command: 'test', aggregated_output: '😀 error', exit_code: 1 } });
  try {
    store.catalog('owner', [run]); writeFileSync(file, first + '\n' + done.slice(0, 20));
    await ingestSource(store, 'owner', { run, path: file, format: 'codex', prompt: 'hello' });
    const sequence = store.head('owner'); const epoch = store.epoch;
    assert.equal(store.snapshot('owner', run.id).items.find((item) => item.id === 'codex:cmd')?.status, 'running');
    store.close(); store = new EventStore(join(dir, 'events.sqlite'));
    assert.equal(store.epoch, epoch); appendFileSync(file, done.slice(20) + '\n');
    await ingestSource(store, 'owner', { run, path: file, format: 'codex', prompt: 'hello' });
    const items = store.snapshot('owner', run.id).items;
    assert.equal(items.filter((item) => item.id === 'codex:cmd').length, 1);
    assert.equal(items.find((item) => item.id === 'codex:cmd')?.status, 'failed');
    assert.match(items.find((item) => item.id === 'codex:cmd')!.detail!, /😀 error\nexit 1/);
    assert.equal(items.filter((item) => item.kind === 'user_message').length, 1);
    const head = store.head('owner'); await ingestSource(store, 'owner', { run, path: file, format: 'codex' }); assert.equal(store.head('owner'), head);
    assert.ok(store.replay('owner', sequence).every((event) => event.sequence > sequence));
    assert.deepEqual(store.snapshot('other', run.id).items, []); assert.deepEqual(store.replay('other', 0), []);
    store.catalog('other', []); assert.equal(store.head('other'), 1);
  } finally { store.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-events-'))); rmSync(dir, { recursive: true, force: true }); }
});
test('Claude partial text, final text and tool results coalesce without duplicated messages', () => {
  const items = new Map(); const state = {};
  const apply = (row: object) => { for (const item of claudeItems(row, 'line', state, (id) => items.get(id) ?? null)) items.set(item.id, item); };
  apply({ type: 'stream_event', event: { type: 'message_start', message: { id: 'm' } } });
  apply({ type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } } });
  apply({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hi 😀' } } });
  apply({ type: 'assistant', message: { id: 'm', content: [{ type: 'text', text: 'Hi 😀' }, { type: 'tool_use', id: 'tool', name: 'Read', input: { file_path: 'file.ts' } }] } });
  apply({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tool', content: 'full file', is_error: false }] } });
  assert.equal(items.size, 2); assert.equal(items.get('claude:m:0').text, 'Hi 😀');
  assert.equal(items.get('tool').status, 'completed'); assert.match(items.get('tool').detail, /full file/);
});
test('huge JSON and split Unicode rows are retained; a replaced source fails truthfully', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-events-')); const file = join(dir, 'raw.jsonl'); const store = new EventStore(join(dir, 'events.sqlite'));
  try {
    const text = '😀'.repeat(200_000); const raw = Buffer.from(JSON.stringify({ type: 'item.completed', item: { id: 'long', type: 'agent_message', text } }) + '\n');
    const cut = raw.indexOf(Buffer.from('😀')) + 2; writeFileSync(file, raw.subarray(0, cut));
    await ingestSource(store, 'owner', { run, path: file, format: 'codex' }); assert.equal(store.head('owner'), 0);
    appendFileSync(file, raw.subarray(cut)); await ingestSource(store, 'owner', { run, path: file, format: 'codex' });
    assert.equal(store.snapshot('owner', run.id).items[0].text, text);
    writeFileSync(file, '{}\n'); await assert.rejects(ingestSource(store, 'owner', { run, path: file, format: 'codex' }), /replaced or truncated/);
  } finally { store.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-events-'))); rmSync(dir, { recursive: true, force: true }); }
});
test('an interrupted tool never gets inferred success from the process ending', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-events-')); const file = join(dir, 'raw.jsonl'); const store = new EventStore(join(dir, 'events.sqlite'));
  try {
    writeFileSync(file, JSON.stringify({ type: 'item.started', item: { id: 'unfinished', type: 'command_execution', command: 'test' } }) + '\n');
    await ingestSource(store, 'owner', { run, path: file, format: 'codex' });
    assert.equal(store.snapshot('owner', run.id).items[0].status, 'running');
    await ingestSource(store, 'owner', { run: { ...run, state: 'stopped' }, path: file, format: 'codex' });
    assert.equal(store.snapshot('owner', run.id).items[0].status, 'unknown');
  } finally { store.close(); assert.ok(dir.startsWith(join(tmpdir(), 'cellar-events-'))); rmSync(dir, { recursive: true, force: true }); }
});
