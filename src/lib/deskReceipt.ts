import type { DeskRun } from './deskProtocol';
import { readDeskRuns } from './deskRunSnapshot';

export type DeskReceipt = {
  commandId: string;
  state: 'pending' | 'confirmed' | 'failed' | 'unknown';
  run?: DeskRun;
  error?: string;
  untrusted?: string;
};

/** A reply may settle only the original start UUID, with a confirmed run. */
export function readDeskReceipt(raw: unknown, commandId: string): DeskReceipt | null {
  if (raw === null) return null;
  const row = raw as DeskReceipt | null;
  if (!row || row.commandId !== commandId || !['pending', 'confirmed', 'failed', 'unknown'].includes(row.state)
    || row.error !== undefined && typeof row.error !== 'string' || row.untrusted !== undefined && typeof row.untrusted !== 'string') throw new Error('Invalid PC start receipt.');
  if (row.state === 'confirmed' && !readDeskRuns([row.run])) throw new Error('PC did not confirm a valid run.');
  return row;
}
