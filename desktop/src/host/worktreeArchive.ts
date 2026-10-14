import { randomUUID } from 'node:crypto';
import { git } from './worktreeGit.ts';

// Generated dependencies/builds can be regenerated. Other ignored files (including
// credentials and local evidence) must never disappear with an automatic cleanup.
const generated = /(^|\/)(?:node_modules|\.gradle)\/|^(?:\.expo|dist|dist-ssr|web-build|android|ios)\/|^desktop\/(?:build|release|renderer-dist)\/|^modules\/[^/]+\/android\/build\//;

export async function checkIgnoredWorktreeFiles(path: string): Promise<void> {
  const ignored = await git(path, 'ls-files', '--others', '--ignored', '--exclude-standard', '-z');
  if (ignored.split('\0').some((file) => file && !generated.test(file))) {
    throw new Error('Worktree has protected ignored files; keep them at the PC before cleanup.');
  }
}

/** A normal Git stash preserves staged, unstaged and nonignored untracked files. */
export async function archiveWorktree(path: string, id: string): Promise<string | null> {
  await checkIgnoredWorktreeFiles(path);
  if (!(await git(path, 'status', '--porcelain', '--untracked-files=all'))) return null;
  const label = `Cellar finished task ${id} ${randomUUID()}`;
  await git(path, 'stash', 'push', '--include-untracked', '-m', label);
  // The stash is shared across worktrees. Find our own entry even if another Git
  // client pushed a stash concurrently; never archive someone else's latest stash.
  const log = await git(path, 'reflog', 'show', '--format=%H%x00%gs', 'refs/stash');
  const commit = log.split('\n').find((line) => line.endsWith(`: ${label}`))?.split('\0')[0];
  if (!commit || !/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Cleanup snapshot could not be verified. Worktree retained.');
  const ref = `refs/cellar/archives/${id}`;
  await git(path, 'update-ref', ref, commit);
  if (await git(path, 'rev-parse', ref) !== commit) throw new Error('Cleanup snapshot reference could not be verified.');
  // Keep the labelled stash too, so users can find it with ordinary Git tools.
  return ref;
}
