import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, lstat, mkdir, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

const exec = promisify(execFile);
const excluded = ['.env', '.env.*', '*.pem', '*.key', '*credentials*', '*secret*', 'google-services.json', '.aws/**', '.codex/**', '.claude/**', 'credentials/**'];
export async function checkpointGit(cwd: string, args: string[], env?: NodeJS.ProcessEnv) {
  const { stdout } = await exec('git', ['-c', `safe.directory=${cwd.replace(/\\/g, '/')}`, '-C', cwd, ...args],
    { env: env ?? process.env, windowsHide: true, timeout: 30_000, maxBuffer: 16 * 1024 * 1024, encoding: 'utf8' });
  return stdout;
}
/** A private index snapshots staged + unstaged + nonignored untracked files; HEAD/index stay intact. */
export async function snapshot(cwd: string, namespace: string) {
  const dir = await mkdtemp(join(tmpdir(), 'cellar-checkpoint-'));
  const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'index') };
  try {
    await checkpointGit(cwd, ['read-tree', '--empty'], env);
    await checkpointGit(cwd, ['add', '-A', '--', '.', ...excluded.map((name) => `:(exclude,glob)**/${name}`)], env);
    const tree = (await checkpointGit(cwd, ['write-tree'], env)).trim();
    const commit = (await checkpointGit(cwd, ['-c', 'user.name=Cellar checkpoint', '-c', 'user.email=checkpoint@localhost', 'commit-tree', tree, '-m', 'Cellar turn checkpoint'], env)).trim();
    const ref = `refs/cellar/checkpoints/${namespace}/${randomUUID()}`;
    await checkpointGit(cwd, ['update-ref', ref, commit]);
    return { ref, tree };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
type TreeFile = { path: string; oid: string; mode: string };
async function files(cwd: string, ref: string): Promise<TreeFile[]> {
  return (await checkpointGit(cwd, ['ls-tree', '-r', '-z', ref])).split('\0').filter(Boolean).map((row) => {
    const tab = row.indexOf('\t'); const [mode, , oid] = row.slice(0, tab).split(' ');
    return { path: row.slice(tab + 1), oid, mode };
  });
}
async function safePath(cwd: string, path: string) {
  const target = resolve(cwd, path); const root = resolve(cwd);
  if (!target.startsWith(root + sep)) throw new Error('Checkpoint path escaped the run folder.');
  let current = target;
  while (current !== root) {
    try { const stat = await lstat(current); if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()) || (stat.isFile() && stat.nlink > 1) || (current === target && !stat.isFile())) throw new Error('Checkpoint refuses linked or special files.'); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    current = dirname(current);
  }
  return target;
}
export async function restoreSnapshot(cwd: string, targetRef: string, currentRef: string) {
  const [target, current] = await Promise.all([files(cwd, targetRef), files(cwd, currentRef)]);
  if ([...target, ...current].some((row) => !['100644', '100755'].includes(row.mode))) throw new Error('Checkpoint contains links or submodules; restore refused.');
  const paths = new Map<string, string>();
  for (const row of [...target, ...current]) paths.set(row.path, await safePath(cwd, row.path));
  // Read every blob before the first filesystem mutation.
  const blobs = await Promise.all(target.map(async (row) => {
    const { stdout } = await exec('git', ['-c', `safe.directory=${cwd.replace(/\\/g, '/')}`, '-C', cwd, 'cat-file', 'blob', row.oid],
      { encoding: 'buffer', windowsHide: true, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 });
    return { row, data: stdout };
  }));
  const keep = new Set(target.map((row) => row.path));
  for (const row of current) if (!keep.has(row.path)) await unlink(paths.get(row.path)!);
  for (const { row, data } of blobs) {
    const path = paths.get(row.path)!; await mkdir(dirname(path), { recursive: true }); await writeFile(path, data, { mode: row.mode === '100755' ? 0o755 : 0o644 });
  }
}
