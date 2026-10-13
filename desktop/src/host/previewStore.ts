import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ManagedPreview, PreviewAction, PreviewReceipt } from '@/lib/deskManagedPreview';
import { DeskError } from './claudeRuns.ts';

type StoredPreview = ManagedPreview & { owner: string };
type Receipt = PreviewReceipt & { owner: string; fingerprint: string };

/** Save before effects; uncertain starts/checks/deploys are never replayed. */
export class PreviewStore {
  readonly previews: StoredPreview[];
  private readonly receipts: Receipt[];
  private readonly file: string;
  private readonly active = new Map<string, Promise<PreviewReceipt>>();
  constructor(dir: string) {
    this.file = join(dir, 'previews.json');
    const saved = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : {};
    this.previews = saved.previews ?? [];
    this.receipts = saved.receipts ?? [];
    for (const row of this.previews) if (['live', 'starting'].includes(row.state)) row.state = 'unknown';
    for (const row of this.receipts) if (row.state === 'pending') {
      row.state = 'unknown'; row.error = 'Host restarted during preview action. Check the PC; action will not replay.';
    }
    this.save();
  }
  save() {
    writeFileSync(`${this.file}.tmp`, JSON.stringify({ previews: this.previews, receipts: this.receipts }));
    renameSync(`${this.file}.tmp`, this.file);
  }
  receipt(owner: string, id: string): PreviewReceipt | null {
    const row = this.receipts.find((r) => r.owner === owner && r.commandId === id);
    if (!row) return null;
    return { commandId: row.commandId, state: row.state, preview: row.preview, error: row.error };
  }
  act(owner: string, request: PreviewAction, work: () => Promise<ManagedPreview>): Promise<PreviewReceipt> {
    const key = `${owner}:${request.commandId}`;
    const fingerprint = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const old = this.receipts.find((r) => r.owner === owner && r.commandId === request.commandId);
    if (old) {
      if (old.fingerprint !== fingerprint) throw new DeskError('Preview commandId belongs to another action.', 409);
      return this.active.get(key) ?? Promise.resolve(this.receipt(owner, request.commandId)!);
    }
    const row: Receipt = { commandId: request.commandId, owner, fingerprint, state: 'pending' };
    this.receipts.push(row); this.save();
    const pending = (async () => {
      await Promise.resolve();
      try { row.preview = await work(); row.state = 'confirmed'; }
      catch (error) { row.state = error instanceof DeskError && error.extra.notStarted ? 'failed' : 'unknown'; row.error = String(error); }
      finally { this.save(); this.active.delete(key); }
      return this.receipt(owner, request.commandId)!;
    })();
    this.active.set(key, pending); return pending;
  }
}
