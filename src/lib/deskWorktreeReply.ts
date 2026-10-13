import type { WorktreeAction, WorktreeReceipt, WorktreeRequest, WorktreeReview } from './deskWorktrees';

/** Both renderers accept only the review for the action they asked to inspect. */
export function readWorktreeReview(raw: unknown, id: string, action: WorktreeAction): WorktreeReview {
  const row = raw as WorktreeReview | null;
  if (!row || row.worktreeId !== id || row.action !== action || !/^[a-f0-9]{64}$/.test(row.token)
    || typeof row.allowed !== 'boolean' || typeof row.summary !== 'string' || typeof row.branch !== 'string' || typeof row.target !== 'string'
    || !/^[a-f0-9]{40,64}$/.test(row.sourceHead) || !/^[a-f0-9]{40,64}$/.test(row.targetHead)
    || (row.reason !== null && typeof row.reason !== 'string') || (!row.allowed && !row.reason)) throw new Error('PC did not return a valid worktree review.');
  return row;
}

export function readWorktreeReceipt(raw: unknown, commandId: string, request?: WorktreeRequest): WorktreeReceipt {
  const row = raw as WorktreeReceipt | null;
  if (!row || row.commandId !== commandId || !['confirmed', 'failed', 'pending', 'unknown'].includes(row.state)) throw new Error('PC did not return a valid action receipt.');
  if (row.state === 'confirmed' && (!row.result || typeof row.result.message !== 'string'
    || request && (row.result.worktreeId !== request.worktreeId || row.result.action !== request.action))) throw new Error('PC did not confirm this worktree action.');
  return row;
}
