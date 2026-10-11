import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { WorktreeReceipt, WorktreeRequest } from '@/lib/deskWorktrees';
import { DeskError } from './claudeRuns.ts';

type Stored = WorktreeReceipt & { owner: string; fingerprint: string };
/** Same intent-before-effect contract as task starts, scoped to the signed-in owner. */
export class WorktreeReceipts {
  private readonly file: string;
  private readonly rows: Stored[];
  private readonly active = new Map<string, Promise<WorktreeReceipt>>();
  constructor(dir: string) {
    this.file = join(dir, 'worktree-receipts.json');
    this.rows = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : [];
    for (const row of this.rows) if (row.state === 'pending') {
      row.state = 'unknown'; row.error = 'PC restarted during this action. Inspect Git on the PC; this command will not replay.';
    }
    this.save();
  }
  private save() {
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.rows)); renameSync(`${this.file}.tmp`, this.file);
  }
  get(owner: string, commandId: string): WorktreeReceipt | null {
    const row = this.rows.find((item) => item.owner === owner && item.commandId === commandId);
    if (!row) return null;
    const { owner: _owner, fingerprint: _fingerprint, ...receipt } = row;
    return receipt;
  }
  async execute(owner: string, request: WorktreeRequest, work: (mutating: () => void) => Promise<NonNullable<WorktreeReceipt['result']>>): Promise<WorktreeReceipt> {
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const key = `${owner}:${request.commandId}`;
    const old = this.rows.find((item) => item.owner === owner && item.commandId === request.commandId);
    if (old) {
      if (old.fingerprint !== fingerprint) throw new DeskError('commandId belongs to another worktree action.', 409);
      return this.active.get(key) ?? this.get(owner, request.commandId)!;
    }
    const row: Stored = { owner, fingerprint, commandId: request.commandId, state: 'pending' };
    this.rows.push(row); this.save();
    const promise = (async () => {
      await Promise.resolve();
      let changed = false;
      try {
        row.result = await work(() => { changed = true; }); row.state = 'confirmed';
      } catch (error) {
        row.state = changed ? 'unknown' : 'failed'; row.error = error instanceof Error ? error.message : String(error);
      }
      this.save(); this.active.delete(key);
      return this.get(owner, request.commandId)!;
    })();
    this.active.set(key, promise);
    return promise;
  }
}
