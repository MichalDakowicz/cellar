import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { git } from './worktreeGit.ts';

/** Reject absolute, traversal, ADS and separator tricks before touching a candidate. */
export function relativeKeyPath(path: string): boolean {
  return !!path && !isAbsolute(path) && !/[\\:"]/.test(path) && ![...path].some((char) => char.charCodeAt(0) < 32)
    && path.split('/').every((part) => !!part && part !== '.' && part !== '..');
}
export function insideKeyRoot(root: string, target: string): boolean {
  const path = relative(root, target);
  return path !== '' && path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}
export async function checkedKeyPath(root: string, path: string): Promise<string | null> {
  if (!relativeKeyPath(path)) return null;
  const target = resolve(root, path);
  if (!insideKeyRoot(root, target)) return null;
  try {
    // Do not follow symlinks/junctions, even if they currently point inside the tree.
    let part = root;
    for (const segment of path.split('/')) {
      part = resolve(part, segment);
      if ((await lstat(part)).isSymbolicLink()) return null;
    }
    const actual = await realpath(target);
    return insideKeyRoot(root, actual) ? actual : null;
  } catch { return null; } // Removed between Git enumeration and filesystem check.
}

/** Git's ignore rules keep build/dependency/private ignored trees out of discovery. */
export async function keyFiles(root: string) {
  // Include commits made on this worktree branch as well as staged/working changes.
  // main is already required by W5; a missing/diverged Git source fails explicitly.
  const base = await git(root, 'merge-base', 'HEAD', 'refs/heads/main');
  const [listed, diff, untracked] = await Promise.all([
    git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'),
    git(root, 'diff', base, '--name-only', '-z'),
    git(root, 'ls-files', '-z', '--others', '--exclude-standard'),
  ]);
  const changed = new Set([...diff.split('\0'), ...untracked.split('\0')]);
  const paths = [...new Set(listed.split('\0').filter(Boolean))];
  if (paths.length > 25_000) throw new Error('Worktree exceeds 25,000 files; narrow this repository at the PC.');
  const files: { path: string; changed: boolean }[] = [];
  const folders = new Map<string, boolean>();
  // Bound concurrent disk work; do not block Electron with synchronous recursive walking.
  for (let offset = 0; offset < paths.length; offset += 64) {
    const batch = await Promise.all(paths.slice(offset, offset + 64).map(async (path) => {
      const actual = await checkedKeyPath(root, path);
      return actual && (await lstat(actual)).isFile() ? path : null;
    }));
    for (const path of batch) if (path) {
      files.push({ path, changed: changed.has(path) });
      const parts = path.split('/'); parts.pop();
      while (parts.length) {
        const folder = `${parts.join('/')}/`;
        folders.set(folder, folders.get(folder) === true || changed.has(path)); parts.pop();
      }
    }
  }
  return { files: [...files, ...[...folders].map(([path, changed]) => ({ path, changed }))],
    notice: null };
}
