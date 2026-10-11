import { open } from 'node:fs/promises';
import type { DeskRun } from '@/lib/deskProtocol';
import type { TurnItem } from '@/lib/deskEvents';
import { EventStore } from './eventStore.ts';
import { claudeItems, codexItems } from './providerItems.ts';

export type EventSource = { run: DeskRun; path: string | null; format: 'codex' | 'claude' | 'plain'; prompt?: string };
/** Only complete UTF-8 lines advance the persisted byte cursor. Partial lines survive restart. */
export async function ingestSource(store: EventStore, owner: string, source: EventSource): Promise<void> {
  const key = `${source.run.id}:${source.path ?? 'prompt'}`;
  const cursor = store.source(owner, key);
  const state = JSON.parse(cursor.state);
  const wasFinalized = !!state.finalized;
  const updates: TurnItem[] = [];
  const finished = ['done', 'failed', 'stopped'].includes(source.run.state);
  const finish = () => {
    if (!finished || state.finalized) return;
    const items = new Map([...store.snapshot(owner, source.run.id).items, ...updates].map((entry) => [entry.id, entry]));
    for (const entry of items.values()) if (entry.status === 'running') updates.push({ ...entry, status: 'unknown' });
    state.finalized = true;
  };
  if (source.prompt && !store.item(owner, source.run.id, 'prompt')) updates.push({ id: 'prompt', kind: 'user_message', text: source.prompt, status: 'completed' });
  if (!source.path) { if (updates.length) store.ingest(owner, source.run.id, key, cursor.offset, cursor.state, updates); return; }
  let file;
  try { file = await open(source.path, 'r'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    if (updates.length) store.ingest(owner, source.run.id, key, cursor.offset, cursor.state, updates);
    return;
  }
  try {
    const { size } = await file.stat();
    if (size < cursor.offset) throw new Error(`Run log was replaced or truncated: ${source.run.id}`);
    if (size === cursor.offset) { finish(); if (updates.length || (!wasFinalized && state.finalized)) store.ingest(owner, source.run.id, key, cursor.offset, JSON.stringify(state), updates); return; }
    state.finalized = false;
    let capacity = Math.min(size - cursor.offset, 256 * 1024);
    let buffer = Buffer.alloc(capacity);
    let length = (await file.read(buffer, 0, capacity, cursor.offset)).bytesRead;
    // A provider can emit one very large JSON row. Grow to a complete row rather than truncate it.
    while (buffer.subarray(0, length).lastIndexOf(10) < 0 && capacity < size - cursor.offset) {
      capacity = Math.min(capacity * 2, size - cursor.offset, 16 * 1024 * 1024);
      if (capacity <= length) throw new Error('Provider row exceeds 16 MiB; transcript is unavailable.');
      buffer = Buffer.alloc(capacity); length = (await file.read(buffer, 0, capacity, cursor.offset)).bytesRead;
    }
    let end = buffer.subarray(0, length).lastIndexOf(10) + 1;
    if (finished && cursor.offset + length === size) end = length;
    if (!end) return;
    let at = cursor.offset;
    const current = new Map<string, TurnItem>();
    const read = (id: string) => current.get(id) ?? store.item(owner, source.run.id, id);
    for (const line of buffer.subarray(0, end).toString('utf8').split('\n')) {
      const prefix = `line:${at}`; at += Buffer.byteLength(line, 'utf8') + 1;
      if (!line.trim()) continue;
      let items: TurnItem[];
      if (source.format === 'plain') items = [{ id: prefix, kind: 'legacy_output', text: line.replace(/\r$/, ''), status: 'unknown' }];
      else {
        let row;
        try { row = JSON.parse(line); } catch {
          items = [{ id: prefix, kind: 'error', text: 'Unparsed provider output', detail: line, status: 'unknown' }];
          for (const entry of items) { current.set(entry.id, entry); updates.push(entry); } continue;
        }
        if (!row || typeof row !== 'object') continue;
        items = source.format === 'codex' ? codexItems(row, prefix) : claudeItems(row, prefix, state, read);
      }
      for (const entry of items) { current.set(entry.id, entry); updates.push(entry); }
    }
    if (cursor.offset + end === size) finish();
    store.ingest(owner, source.run.id, key, cursor.offset + end, JSON.stringify(state), updates);
  } finally { await file.close(); }
}
