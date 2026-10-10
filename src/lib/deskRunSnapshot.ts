import { isDeskAgent, type DeskRun } from './deskProtocol';

const STATES: readonly unknown[] = ['running', 'waiting', 'done', 'failed', 'stopped'];

/** Missing or malformed snapshots are unavailable, never a confirmed empty PC. */
export function readDeskRuns(raw: unknown): DeskRun[] | null {
  if (!Array.isArray(raw)) return null;
  for (const value of raw) {
    if (!value || typeof value !== 'object') return null;
    const run = value as Partial<DeskRun>;
    if (typeof run.id !== 'string' || !run.id || !isDeskAgent(run.agent) ||
      typeof run.name !== 'string' || typeof run.cwd !== 'string' ||
      typeof run.startedAt !== 'number' || !Number.isFinite(run.startedAt) ||
      !STATES.includes(run.state) || (run.origin !== 'phone' && run.origin !== 'pc') ||
      (run.entryId !== null && typeof run.entryId !== 'string')) return null;
  }
  return raw as DeskRun[];
}
