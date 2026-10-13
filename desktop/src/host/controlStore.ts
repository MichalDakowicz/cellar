import { DatabaseSync } from 'node:sqlite';
import type { ControlReceipt, QueuedMessage, RunControl } from '@/lib/deskDispatch';
import { DeskError } from './claudeRuns.ts';

/** Receipts and queue survive crashes. Claimed provider effects are never replayed. */
export class ControlStore {
  private readonly db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS controls (id TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL);`);
    for (const row of this.db.prepare('SELECT owner,body FROM queue').all() as { owner: string; body: string }[]) {
      const item = JSON.parse(row.body) as QueuedMessage;
      if (['queued', 'dispatching'].includes(item.state)) this.saveItem(row.owner, { ...item, state: 'unknown',
        error: item.state === 'queued' ? 'PC restarted; saved message was not replayed. Original chat is unavailable.' : 'PC restarted during delivery; message may have reached the agent. It will not be replayed.' });
    }
    for (const row of this.db.prepare('SELECT owner,body FROM controls').all() as { owner: string; body: string }[]) {
      const receipt = JSON.parse(row.body) as ControlReceipt;
      if (receipt.state === 'pending' && receipt.action === 'stopAll') {
        const hosts = receipt.hosts?.map((host) => host.commandId === receipt.commandId && host.state === 'pending'
          ? { ...host, state: 'unknown' as const, error: 'PC restarted before confirming local stops. They will not be replayed.' } : host);
        this.saveReceipt(row.owner, { ...receipt, hosts, state: hosts?.some((host) => host.state === 'pending') ? 'pending' : 'unknown', error: 'PC restarted; inspect per-host stop results.' });
      }
      if (receipt.state === 'pending' && receipt.action !== 'stopAll') this.saveReceipt(row.owner, { ...receipt, state: 'unknown', error: 'PC restarted during this action. Check the original run; no effect will be replayed.' });
    }
  }
  close() { this.db.close(); }
  receipt(owner: string, id: string): ControlReceipt | null {
    const row = this.db.prepare('SELECT body FROM controls WHERE owner=? AND id=?').get(owner, id) as { body: string } | undefined;
    return row ? JSON.parse(row.body) : null;
  }
  begin(owner: string, request: RunControl): { fresh: boolean; receipt: ControlReceipt } {
    const row = this.db.prepare('SELECT payload,body FROM controls WHERE owner=? AND id=?').get(owner, request.commandId) as { payload: string; body: string } | undefined;
    if (row) {
      if (row.payload !== JSON.stringify(request)) throw new DeskError('Control ID belongs to another action.', 409);
      return { fresh: false, receipt: JSON.parse(row.body) };
    }
    const receipt: ControlReceipt = { commandId: request.commandId, action: request.action, runId: request.runId, state: 'pending' };
    this.db.prepare('INSERT INTO controls VALUES (?,?,?,?)').run(request.commandId, owner, JSON.stringify(request), JSON.stringify(receipt));
    return { fresh: true, receipt };
  }
  saveReceipt(owner: string, receipt: ControlReceipt) {
    this.db.prepare('UPDATE controls SET body=? WHERE owner=? AND id=?').run(JSON.stringify(receipt), owner, receipt.commandId);
  }
  items(owner: string, runId: string): QueuedMessage[] {
    return (this.db.prepare('SELECT body FROM queue WHERE owner=? ORDER BY rowid').all(owner) as { body: string }[])
      .map((row) => JSON.parse(row.body) as QueuedMessage).filter((item) => item.runId === runId);
  }
  item(owner: string, runId: string, id: string) { return this.items(owner, runId).find((row) => row.id === id) ?? null; }
  saveItem(owner: string, item: QueuedMessage) {
    // UPDATE preserves FIFO row order on edit/claim.
    this.db.prepare('INSERT INTO queue VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body WHERE queue.owner=excluded.owner').run(item.id, owner, JSON.stringify(item));
  }
  transaction(write: () => void) {
    this.db.exec('BEGIN IMMEDIATE');
    try { write(); this.db.exec('COMMIT'); } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
