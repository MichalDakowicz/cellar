import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DeskStart, DeskRun } from '@/lib/deskProtocol';
import type { DeskReceipt } from '@/lib/deskReceipt';
import { DeskError } from './claudeRuns.ts';

type Stored = DeskReceipt & { owner: string; fingerprint: string };

/** Persist intent before a side effect. An interrupted start is uncertain, never replayed. */
export class Receipts {
  private readonly file: string;
  private readonly records: Stored[];
  private readonly active = new Map<string, Promise<DeskRun>>();
  constructor(dir: string) {
    this.file = join(dir, 'start-receipts.json');
    this.records = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : [];
    for (const record of this.records) if (record.state === 'pending') {
      record.state = 'unknown';
      record.error = 'Host restarted during start. Check the PC; this command will not run again.';
    }
    this.save();
  }
  private save() {
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.records));
    renameSync(`${this.file}.tmp`, this.file);
  }
  get(owner: string, id: string): DeskReceipt | null {
    const row = this.records.find((record) => record.owner === owner && record.commandId === id);
    if (!row) return null;
    const { owner: _owner, fingerprint: _fingerprint, ...receipt } = row;
    return receipt;
  }
  async start(owner: string, request: DeskStart, work: () => Promise<DeskRun>): Promise<DeskRun> {
    if (!request.commandId) throw new DeskError('Update the phone: a durable commandId is required.', 409, { notStarted: true });
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const key = `${owner}:${request.commandId}`;
    const old = this.records.find((row) => row.owner === owner && row.commandId === request.commandId);
    if (old) {
      if (old.fingerprint !== fingerprint) throw new DeskError('commandId belongs to a different task. Recover that task first.', 409);
      if (this.active.has(key)) return this.active.get(key)!;
      if (old.state === 'confirmed' && old.run) return old.run;
      throw new DeskError(old.error ?? 'Start still pending; check its receipt.', 409, { receipt: this.get(owner, old.commandId), untrusted: old.untrusted });
    }
    const row: Stored = { owner, commandId: request.commandId, fingerprint, state: 'pending' };
    this.records.push(row);
    this.save();
    const pending = (async () => {
      await Promise.resolve(); // Publish the in-flight promise before work can settle.
      try {
        const run = await work();
        row.run = run;
        row.state = 'confirmed';
        this.save();
        return run;
      } catch (error) {
        row.state = error instanceof DeskError && error.extra.notStarted === true ? 'failed' : 'unknown';
        row.error = error instanceof Error ? error.message : String(error);
        row.untrusted = error instanceof DeskError && typeof error.extra.untrusted === 'string' ? error.extra.untrusted : undefined;
        this.save();
        throw new DeskError(row.error, 409, { receipt: this.get(owner, row.commandId), untrusted: row.untrusted });
      } finally { this.active.delete(key); }
    })();
    this.active.set(key, pending);
    return pending;
  }
}
