import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import type { ApprovalDecision, ApprovalReceipt, RuntimeRequest } from '@/lib/deskApprovals';
import { readApprovalAnswer, pendingApproval } from '@/lib/deskApprovals';
import { DeskError } from './claudeRuns.ts';

type OpenRequest = Omit<RuntimeRequest, 'id' | 'state' | 'createdAt'>;
type Reply = (decision: ApprovalDecision) => Promise<void>;
/** Claim an answer before touching a provider. A crash cannot authorize a second reply. */
export class Approvals {
  private readonly db: DatabaseSync;
  private readonly callbacks = new Map<string, Reply>();
  constructor(path: string, private readonly changed: (owner: string, rows: RuntimeRequest[]) => void = () => {}) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
      CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, owner TEXT NOT NULL, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS answers (id TEXT PRIMARY KEY, owner TEXT NOT NULL, payload TEXT NOT NULL, body TEXT NOT NULL);`);
    for (const record of this.db.prepare('SELECT owner,body FROM requests').all() as { owner: string; body: string }[]) {
      const row = JSON.parse(record.body) as RuntimeRequest;
      if (pendingApproval(row)) this.save(record.owner, { ...row, state: row.state === 'answering' ? 'unknown' : 'expired',
        error: 'PC restarted; the original provider callback is unavailable.' }, false);
    }
    for (const record of this.db.prepare('SELECT id,body FROM answers').all() as { id: string; body: string }[]) {
      const receipt = JSON.parse(record.body) as ApprovalReceipt;
      if (receipt.state === 'pending') this.db.prepare('UPDATE answers SET body=? WHERE id=?').run(JSON.stringify({ ...receipt,
        state: 'unknown', request: { ...receipt.request, state: 'unknown' }, error: 'PC restarted during delivery. This decision will not be replayed.' }), record.id);
    }
  }
  close() { this.db.close(); }
  list(owner: string): RuntimeRequest[] {
    return (this.db.prepare('SELECT body FROM requests WHERE owner=? ORDER BY rowid DESC').all(owner) as { body: string }[])
      .map((row) => JSON.parse(row.body) as RuntimeRequest).sort((a, b) => b.createdAt - a.createdAt);
  }
  get(owner: string, id: string): RuntimeRequest | null {
    const row = this.db.prepare('SELECT body FROM requests WHERE owner=? AND id=?').get(owner, id) as { body: string } | undefined;
    return row ? JSON.parse(row.body) : null;
  }
  private save(owner: string, row: RuntimeRequest, publish = true) {
    this.db.prepare('INSERT OR REPLACE INTO requests VALUES (?,?,?)').run(row.id, owner, JSON.stringify(row));
    if (publish) this.changed(owner, this.list(owner));
  }
  open(owner: string, input: OpenRequest, reply: Reply): RuntimeRequest {
    const row: RuntimeRequest = { ...input, id: randomUUID(), state: 'pending', createdAt: Date.now() };
    this.callbacks.set(row.id, reply); this.save(owner, row); return row;
  }
  waiting(owner: string, runId: string): boolean { return this.list(owner).some((row) => row.runId === runId && pendingApproval(row)); }
  acknowledge(owner: string, id: string) {
    const row = this.get(owner, id);
    if (!row?.decision || !['answering', 'unknown'].includes(row.state)) return;
    const answered = { ...row, state: 'answered' as const, error: undefined };
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.save(owner, answered, false);
      for (const record of this.db.prepare('SELECT id,body FROM answers WHERE owner=?').all(owner) as { id: string; body: string }[]) {
        const receipt = JSON.parse(record.body) as ApprovalReceipt;
        if (receipt.requestId === id && ['pending', 'unknown'].includes(receipt.state)) {
          this.db.prepare('UPDATE answers SET body=? WHERE id=? AND owner=?').run(JSON.stringify({ ...receipt, request: answered, state: 'confirmed', error: undefined }), record.id, owner);
        }
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    this.changed(owner, this.list(owner));
  }
  expire(owner: string, id: string, reason = 'Agent stopped waiting for this request.') {
    const row = this.get(owner, id); this.callbacks.delete(id);
    if (row && pendingApproval(row)) this.save(owner, { ...row, state: row.state === 'answering' ? 'unknown' : 'expired', error: reason });
  }
  expireRun(owner: string, runId: string, reason?: string) { for (const row of this.list(owner)) if (row.runId === runId) this.expire(owner, row.id, reason); }
  receipt(owner: string, id: string): ApprovalReceipt | null {
    const row = this.db.prepare('SELECT body FROM answers WHERE owner=? AND id=?').get(owner, id) as { body: string } | undefined;
    return row ? JSON.parse(row.body) : null;
  }
  async answer(owner: string, raw: unknown): Promise<ApprovalReceipt> {
    const answer = readApprovalAnswer(raw);
    if (!answer) throw new DeskError('Invalid approval answer.');
    const old = this.db.prepare('SELECT payload,body FROM answers WHERE id=? AND owner=?').get(answer.commandId, owner) as { payload: string; body: string } | undefined;
    if (old) {
      if (old.payload !== JSON.stringify(answer)) throw new DeskError('Approval command ID has different choices.', 409);
      return JSON.parse(old.body);
    }
    let row = this.get(owner, answer.requestId);
    if (!row) throw new DeskError('No such approval for this account.', 404);
    const reply = this.callbacks.get(row.id);
    let receipt: ApprovalReceipt = { commandId: answer.commandId, requestId: row.id, request: row, state: 'failed' };
    if (row.state !== 'pending') receipt.error = 'This request was already answered or is no longer available.';
    else if (answer.decision === 'always' && !row.always) receipt.error = 'This provider does not offer a broader grant.';
    else if (!reply) { this.expire(owner, row.id); row = this.get(owner, row.id)!; receipt.request = row; receipt.error = 'Provider callback unavailable.'; }
    else { row = { ...row, state: 'answering', decision: answer.decision, source: answer.source }; receipt = { ...receipt, request: row, state: 'pending' }; }
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO answers VALUES (?,?,?,?)').run(answer.commandId, owner, JSON.stringify(answer), JSON.stringify(receipt));
      this.save(owner, row, false); this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    this.changed(owner, this.list(owner));
    if (receipt.state !== 'pending') return receipt;
    try {
      await reply!(answer.decision);
      // A cancelled/replaced provider request cannot become a confirmed authorization.
      if (!['answering', 'answered'].includes(this.get(owner, row.id)?.state ?? '')) throw new Error('Provider stopped waiting before confirmation.');
      row = { ...row, state: 'answered' }; receipt = { ...receipt, request: row, state: 'confirmed' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const acknowledged = this.get(owner, row.id);
      row = acknowledged?.state === 'answered' ? acknowledged : { ...row, state: 'unknown', error: message };
      receipt = { ...receipt, request: row, state: row.state === 'answered' ? 'confirmed' : 'unknown', ...(row.state !== 'answered' ? { error: message } : {}) };
    }
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.save(owner, row, false);
      this.db.prepare('UPDATE answers SET body=? WHERE owner=? AND id=?').run(JSON.stringify(receipt), owner, answer.commandId);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    this.callbacks.delete(row.id); this.changed(owner, this.list(owner)); return receipt;
  }
}
