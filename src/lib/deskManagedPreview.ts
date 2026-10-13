import type { DeskRun } from './deskProtocol';
import type { PreviewCheck } from './deskPreview';

export type ManagedPreview = {
  id: string; projectId: string; runId: string; cwd: string; worktreeId?: string;
  port: number; jobId: string; state: 'starting' | 'live' | 'stopped' | 'failed' | 'unknown';
  openedAt: number | null; checks: { command: string; jobId: string }[]; deployJobId?: string;
};
export type PreviewAction = { commandId: string; projectId: string; runId: string;
  action: 'start' | 'stop' | 'checks' | 'deploy'; confirmUnopened?: boolean };
export type PreviewReceipt = { commandId: string; state: 'pending' | 'confirmed' | 'unknown' | 'failed';
  preview?: ManagedPreview; error?: string };
export const CHECK_COMMANDS = ['check', 'typecheck', 'type-check', 'lint', 'test'] as const;
export function previewRuns(runs: readonly DeskRun[]): DeskRun[] { return runs.filter((r) => !!r.projectId && r.agent !== 'job'); }
export function readManagedPreviews(raw: unknown): ManagedPreview[] {
  if (!Array.isArray(raw) || raw.length > 1000 || raw.some((p) => !p || typeof p !== 'object' ||
    ['id', 'projectId', 'runId', 'cwd', 'jobId'].some((key) => typeof p[key] !== 'string' || !p[key]) ||
    !Number.isInteger(p.port) || p.port < 1 || p.port > 65535 || !['starting', 'live', 'stopped', 'failed', 'unknown'].includes(p.state) ||
    (p.openedAt !== null && (typeof p.openedAt !== 'number' || !Number.isFinite(p.openedAt))) ||
    !Array.isArray(p.checks) || p.checks.some((c: { command?: unknown; jobId?: unknown }) => typeof c?.command !== 'string' || typeof c.jobId !== 'string'))) throw new Error('Invalid PC previews response.');
  return raw as ManagedPreview[];
}
export function readPreviewReceipt(raw: unknown, commandId: string): PreviewReceipt {
  const row = raw as PreviewReceipt | null;
  if (!row || row.commandId !== commandId || !['pending', 'confirmed', 'unknown', 'failed'].includes(row.state) ||
    (row.error !== undefined && typeof row.error !== 'string') || (row.state === 'confirmed' && !row.preview)) throw new Error('Invalid PC preview receipt.');
  if (row.preview) readManagedPreviews([row.preview]); return row;
}

export function parsePreviewAction(raw: unknown): PreviewAction {
  const row = raw as Partial<PreviewAction> | null;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  if (!row || !uuid.test(row.commandId ?? '') || !uuid.test(row.projectId ?? '') ||
    typeof row.runId !== 'string' || !row.runId || row.runId.length > 100 ||
    !['start', 'stop', 'checks', 'deploy'].includes(row.action ?? '') ||
    (row.confirmUnopened !== undefined && typeof row.confirmUnopened !== 'boolean')) throw new Error('Invalid preview action.');
  return { commandId: row.commandId!, projectId: row.projectId!, runId: row.runId,
    action: row.action!, ...(row.confirmUnopened === true ? { confirmUnopened: true } : {}) };
}

export function managedChecks(preview: ManagedPreview | null, jobs: readonly DeskRun[]): PreviewCheck[] {
  return (preview?.checks ?? []).map(({ command, jobId }) => {
    const state = jobs.find((row) => row.id === jobId)?.state;
    return { label: `$${command}`, command: true, state: state === 'done' ? 'passed' : state === 'running' ? 'running' : 'failed',
      detail: state === 'done' ? 'passed' : state === 'running' ? 'running' : state === 'failed' ? 'failed' : state === 'stopped' ? 'stopped' : 'result unknown' };
  });
}
