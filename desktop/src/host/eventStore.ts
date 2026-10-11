import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { DeskEvent, EventSnapshot, TurnItem } from '@/lib/deskEvents';
import { markdownChunks } from '@/lib/deskEvents';
import type { DeskRun } from '@/lib/deskProtocol';
import type { RuntimeRequest } from '@/lib/deskApprovals';

type Source = { offset: number; state: string };
/** Events, projection and source cursor commit together. A crash cannot duplicate ingestion. */
export class EventStore {
  readonly epoch: string;
  private readonly db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (owner TEXT NOT NULL, seq INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(owner,seq));
      CREATE TABLE IF NOT EXISTS catalog (owner TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS items (owner TEXT NOT NULL, run TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY(owner,run,id));
      CREATE TABLE IF NOT EXISTS sources (owner TEXT NOT NULL, key TEXT NOT NULL, offset INTEGER NOT NULL, state TEXT NOT NULL, PRIMARY KEY(owner,key));`);
    this.db.prepare('INSERT OR IGNORE INTO meta VALUES (?,?)').run('epoch', randomUUID());
    this.epoch = (this.db.prepare('SELECT value FROM meta WHERE key=?').get('epoch') as { value: string }).value;
  }
  close() { this.db.close(); }
  approvals(owner: string, requests: RuntimeRequest[]): void {
    const key = `approvals:${owner}`; const body = JSON.stringify(requests);
    const old = this.db.prepare('SELECT value FROM meta WHERE key=?').get(key) as { value: string } | undefined;
    if (old?.value === body) return;
    this.transaction(() => {
      this.db.prepare('INSERT OR REPLACE INTO meta VALUES (?,?)').run(key, body);
      this.write(owner, { kind: 'approvals', runId: null, approvals: requests } as Omit<DeskEvent, 'sequence' | 'at'>);
    });
  }
  head(owner: string): number { return Number((this.db.prepare('SELECT COALESCE(MAX(seq),0) AS seq FROM events WHERE owner=?').get(owner) as { seq: number }).seq); }
  source(owner: string, key: string): Source {
    return this.db.prepare('SELECT offset,state FROM sources WHERE owner=? AND key=?').get(owner, key) as Source | undefined ?? { offset: 0, state: '{}' };
  }
  item(owner: string, run: string, id: string): TurnItem | null {
    const row = this.db.prepare('SELECT body FROM items WHERE owner=? AND run=? AND id=?').get(owner, run, id) as { body: string } | undefined;
    return row ? JSON.parse(row.body) : null;
  }
  private write(owner: string, body: Omit<DeskEvent, 'sequence' | 'at'>): void {
    const sequence = this.head(owner) + 1;
    this.db.prepare('INSERT INTO events VALUES (?,?,?)').run(owner, sequence, JSON.stringify({ ...body, sequence, at: Date.now() }));
  }
  catalog(owner: string, runs: DeskRun[]): void {
    const body = JSON.stringify(runs);
    const previous = this.db.prepare('SELECT body FROM catalog WHERE owner=?').get(owner) as { body: string } | undefined;
    if (previous?.body === body) return;
    this.transaction(() => {
      this.db.prepare('INSERT OR REPLACE INTO catalog VALUES (?,?)').run(owner, body);
      this.write(owner, { kind: 'catalog', runId: null, runs } as Omit<DeskEvent, 'sequence' | 'at'>);
    });
  }
  ingest(owner: string, run: string, key: string, offset: number, state: string, updates: TurnItem[]): void {
    this.transaction(() => {
      for (const original of new Map(updates.map((item) => [item.id, item])).values()) {
        const item = original.kind === 'assistant_message' ? { ...original, parts: markdownChunks(original.text) } : original;
        const body = JSON.stringify(item);
        if (JSON.stringify(this.item(owner, run, item.id)) === body) continue;
        const position = this.head(owner) + 1;
        this.db.prepare('INSERT INTO items VALUES (?,?,?,?,?) ON CONFLICT(owner,run,id) DO UPDATE SET body=excluded.body').run(owner, run, item.id, position, body);
        this.write(owner, { kind: 'item', runId: run, item } as Omit<DeskEvent, 'sequence' | 'at'>);
      }
      this.db.prepare('INSERT OR REPLACE INTO sources VALUES (?,?,?,?)').run(owner, key, offset, state);
    });
  }
  replay(owner: string, after: number, through = this.head(owner), limit = 256): DeskEvent[] {
    return (this.db.prepare('SELECT body FROM events WHERE owner=? AND seq>? AND seq<=? ORDER BY seq LIMIT ?').all(owner, after, through, limit) as { body: string }[]).map((row) => JSON.parse(row.body));
  }
  snapshot(owner: string, runId: string | null): EventSnapshot {
    const row = this.db.prepare('SELECT body FROM catalog WHERE owner=?').get(owner) as { body: string } | undefined;
    const runs: DeskRun[] = row ? JSON.parse(row.body) : [];
    const items = runId ? (this.db.prepare('SELECT body FROM items WHERE owner=? AND run=? ORDER BY position').all(owner, runId) as { body: string }[]).map((item) => JSON.parse(item.body)) : [];
    const approvals = this.db.prepare('SELECT value FROM meta WHERE key=?').get(`approvals:${owner}`) as { value: string } | undefined;
    return { epoch: this.epoch, sequence: this.head(owner), runs, runId, items, at: Date.now(), ...(approvals ? { approvals: JSON.parse(approvals.value) } : {}) };
  }
  private transaction(fn: () => void): void {
    this.db.exec('BEGIN IMMEDIATE');
    try { fn(); this.db.exec('COMMIT'); } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
