import { execFile } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { repoKey } from '@/lib/repoLink';
import { DeskError } from './claudeRuns.ts';

const exec = promisify(execFile);
export async function git(cwd: string, ...args: string[]): Promise<string> {
  try {
    const { stdout } = await exec('git', ['-c', `safe.directory=${cwd.replace(/\\/g, '/')}`, '-c', 'core.longpaths=true', '-C', cwd, ...args],
      { windowsHide: true, timeout: 30_000, maxBuffer: 2 * 1024 * 1024, encoding: 'utf8' });
    return stdout.trim();
  } catch (error) {
    const detail = error as Error & { stderr?: string };
    throw new DeskError(detail.stderr?.trim() || detail.message, 409);
  }
}

export type GitTree = { path: string; head: string; branch: string | null; locked: boolean };
export async function gitTrees(root: string): Promise<GitTree[]> {
  const text = await git(root, 'worktree', 'list', '--porcelain', '-z');
  return text.split('\0\0').filter(Boolean).map((block) => {
    const lines = block.split('\0');
    return { path: lines.find((line) => line.startsWith('worktree '))!.slice(9),
      head: lines.find((line) => line.startsWith('HEAD '))?.slice(5) ?? '',
      branch: lines.find((line) => line.startsWith('branch refs/heads/'))?.slice(18) ?? null,
      locked: lines.some((line) => line === 'locked' || line.startsWith('locked ')) };
  });
}

export async function repository(path: string): Promise<string> {
  const root = realpathSync.native(path);
  if (repoKey(await git(root, 'rev-parse', '--show-toplevel')) !== repoKey(root)) {
    throw new DeskError('Project folder must be a Git repository root.', 409, { notStarted: true });
  }
  await git(root, 'rev-parse', '--verify', 'refs/heads/main^{commit}');
  return root;
}

export function managedPath(root: string, path: string): string {
  const base = resolve(root);
  const target = resolve(path);
  if (!target.toLowerCase().startsWith(`${base.toLowerCase()}${sep}`) || target === base) {
    throw new DeskError('Worktree folder is outside Cellar’s managed directory.', 403);
  }
  return target;
}

export async function clean(path: string): Promise<boolean> {
  return !(await git(path, 'status', '--porcelain', '--untracked-files=all'));
}

export async function ancestor(path: string, before: string, after: string): Promise<boolean> {
  try { await git(path, 'merge-base', '--is-ancestor', before, after); return true; }
  catch { return false; }
}
