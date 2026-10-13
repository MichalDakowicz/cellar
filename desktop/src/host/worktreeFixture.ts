import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import type { DeskRun, DeskStart } from '@/lib/deskProtocol';
import type { Account } from './account.ts';
import { git } from './worktreeGit.ts';
import { Worktrees } from './worktrees.ts';

export const projectId = '00000000-0000-4000-8000-000000000010';
export const commandId = '00000000-0000-4000-8000-000000000001';
export async function worktreeFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-worktrees-'));
  const root = join(dir, 'repo with spaces'); mkdirSync(root);
  const data = join(dir, 'data'); mkdirSync(data);
  await git(root, 'init', '-b', 'main');
  await git(root, 'config', 'core.autocrlf', 'false');
  await git(root, 'config', 'user.name', 'Cellar test'); await git(root, 'config', 'user.email', 'cellar@test.invalid');
  writeFileSync(join(root, 'file.txt'), 'base\n'); await git(root, 'add', '.'); await git(root, 'commit', '-m', 'base');
  const runs: DeskRun[] = [];
  const account = { current: { userId: 'owner' }, commandProjects: async () => [{ projectId, path: root }],
    claimTaskEntries: async () => {}, releaseTaskEntries: async () => {} } as unknown as Account;
  const manager = new Worktrees(data, account, async () => runs);
  const request: DeskStart = { commandId, worktreeId: commandId, projectId, cwd: root, where: 'worktree', agent: 'codex',
    mode: 'ask', prompt: 'test isolated workspace', name: null, entryId: null, entryIds: [] };
  const finished = (path: string, id = commandId) => {
    runs.push({ id: 'abcdef01', agent: 'codex', cwd: path, worktreeId: id, projectId, state: 'done', name: 'test', startedAt: Date.now(), entryId: null, origin: 'phone' });
  };
  const dispose = async () => {
    for (const tree of (await manager.list())[0]?.worktrees ?? []) if (tree.id) await git(root, 'worktree', 'remove', tree.path).catch(() => {});
    assert.ok(dir.startsWith(join(tmpdir(), 'cellar-worktrees-')));
    rmSync(dir, { recursive: true, force: true });
  };
  return { dir, root, data, runs, account, manager, request, finished, dispose };
}
