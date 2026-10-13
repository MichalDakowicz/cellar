/** Git-confirmed workspaces; samples never enter this protocol. */
export type DeskWorktree = {
  id: string | null;
  projectId: string;
  path: string;
  branch: string | null;
  head: string;
  main: boolean;
  dirty: boolean | null;
  unavailable: string | null;
  locked: boolean;
  kept: boolean;
};

export type DeskProjectWorktrees = {
  projectId: string;
  base: 'main';
  available: boolean;
  reason: string | null;
  worktrees: DeskWorktree[];
};

export type WorktreeAction = 'keep' | 'merge' | 'remove';
export type WorktreeReview = {
  worktreeId: string;
  action: WorktreeAction;
  token: string;
  branch: string;
  target: string;
  sourceHead: string;
  targetHead: string;
  summary: string;
  allowed: boolean;
  reason: string | null;
};
export type WorktreeRequest = { commandId: string; worktreeId: string; action: WorktreeAction; token: string };
export type WorktreeReceipt = {
  commandId: string;
  state: 'pending' | 'confirmed' | 'failed' | 'unknown';
  result?: { action: WorktreeAction; worktreeId: string; message: string };
  error?: string;
};

export function worktreeSlug(text: string, id: string): string {
  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36).replace(/-$/, '') || 'task';
  return `${slug}-${id.replace(/-/g, '')}`;
}

export function finishedWorktreeRun(state: string): boolean {
  return ['done', 'failed', 'stopped'].includes(state);
}

export function readProjectWorktrees(raw: unknown): DeskProjectWorktrees[] {
  if (!Array.isArray(raw) || raw.some((project) => !project || typeof project.projectId !== 'string'
    || project.base !== 'main' || typeof project.available !== 'boolean'
    || (project.reason !== null && typeof project.reason !== 'string') || !Array.isArray(project.worktrees)
    || project.worktrees.some((row: DeskWorktree) => !row || (row.id !== null && typeof row.id !== 'string')
      || row.projectId !== project.projectId || typeof row.path !== 'string' || !row.path
      || (row.branch !== null && typeof row.branch !== 'string') || !/^[a-f0-9]{40,64}$/.test(row.head)
      || (row.dirty !== null && typeof row.dirty !== 'boolean') || (row.unavailable !== null && typeof row.unavailable !== 'string')
      || ['main', 'locked', 'kept'].some((key) => typeof row[key as keyof DeskWorktree] !== 'boolean')))) {
    throw new Error('PC did not return a valid worktree list.');
  }
  return raw;
}
