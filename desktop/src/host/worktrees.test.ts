import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { git } from './worktreeGit.ts';
import { Worktrees } from './worktrees.ts';
import { worktreeFixture } from './worktreeFixture.ts';
import type { WorktreeAction } from '@/lib/deskWorktrees';

test('invalid names and provider failures do not create a branch or launch a task', async () => {
  const f = await worktreeFixture();
  try {
    for (const nameBranch of [async () => 'wt/unsafe', async () => { throw new Error('provider unavailable'); }]) {
      const manager = new Worktrees(f.data, f.account, async () => f.runs, undefined, nameBranch);
      await assert.rejects(manager.create(f.request), /valid task branch|provider unavailable/);
      assert.equal((await manager.list())[0].worktrees.length, 1);
      assert.equal(await git(f.root, 'branch', '--format=%(refname:short)'), 'main');
      assert.equal(f.runs.length, 0);
    }
  } finally { await f.dispose(); }
});

test('Git-confirmed creation leaves checkout changes intact; finished keep/merge/remove survive restart', async () => {
  const f = await worktreeFixture();
  const action = async (name: WorktreeAction) => {
    const review = await f.manager.review(f.request.worktreeId!, name);
    assert.equal(review.allowed, true, review.reason ?? '');
    return f.manager.act({ commandId: randomUUID(), worktreeId: review.worktreeId, action: name, token: review.token });
  };
  try {
    writeFileSync(join(f.root, 'file.txt'), 'local checkout edits\n');
    const workspace = await f.manager.create(f.request);
    assert.equal(readFileSync(join(workspace.path, 'file.txt'), 'utf8'), 'base\n');
    assert.equal(readFileSync(join(f.root, 'file.txt'), 'utf8'), 'local checkout edits\n');
    assert.equal(await git(workspace.path, 'branch', '--show-current'), workspace.branch);
    assert.equal((await f.manager.review(workspace.id, 'keep')).allowed, false);
    f.finished(workspace.path);
    assert.equal((await action('keep')).state, 'confirmed');
    writeFileSync(join(workspace.path, 'file.txt'), 'worktree change\n');
    assert.equal((await f.manager.review(workspace.id, 'remove')).allowed, false);
    await git(workspace.path, 'add', '.'); await git(workspace.path, 'commit', '-m', 'change');
    assert.match((await f.manager.review(workspace.id, 'remove')).reason!, /unmerged/);
    assert.match((await f.manager.review(workspace.id, 'merge')).reason!, /Main has local changes/);
    await git(f.root, 'restore', 'file.txt');
    const review = await f.manager.review(workspace.id, 'merge');
    assert.match(review.summary, /file.txt/);
    const request = { commandId: randomUUID(), worktreeId: workspace.id, action: 'merge' as const, token: review.token };
    assert.equal((await f.manager.act(request)).state, 'confirmed');
    const restarted = new Worktrees(f.data, f.account, async () => f.runs);
    assert.equal((await restarted.act(request)).state, 'confirmed');
    assert.equal(readFileSync(join(f.root, 'file.txt'), 'utf8'), 'worktree change\n');
    assert.equal((await action('remove')).state, 'confirmed');
    assert.equal(existsSync(workspace.path), false);
    assert.equal(await git(f.root, 'rev-parse', `refs/heads/${workspace.branch}`), await git(f.root, 'rev-parse', 'main'));
    assert.equal((await f.manager.list())[0].worktrees.length, 1);
  } finally { await f.dispose(); }
});

test('stale reviews, dirty paths, active/unknown runs, changed branches and foreign accounts refuse effects', async () => {
  const f = await worktreeFixture();
  try {
    const workspace = await f.manager.create(f.request); f.finished(workspace.path);
    const review = await f.manager.review(workspace.id, 'remove');
    writeFileSync(join(workspace.path, 'untracked.txt'), 'do not delete');
    const refused = await f.manager.act({ commandId: randomUUID(), worktreeId: workspace.id, action: 'remove', token: review.token });
    assert.equal(refused.state, 'failed'); assert.equal(existsSync(workspace.path), true);
    for (const state of ['running', 'waiting', 'unknown'] as const) {
      f.runs[0].state = state;
      assert.equal((await f.manager.review(workspace.id, 'keep')).allowed, false);
    }
    f.runs[0].state = 'done';
    const keep = await f.manager.review(workspace.id, 'keep');
    f.runs[0].startedAt++;
    const stale = await f.manager.act({ commandId: randomUUID(), worktreeId: workspace.id, action: 'keep', token: keep.token });
    assert.equal(stale.state, 'failed'); assert.match(stale.error!, /changed since review/);
    f.account.current!.userId = 'other';
    assert.equal((await f.manager.list())[0].worktrees.find((row) => row.path.replace(/\\/g, '/') === workspace.path.replace(/\\/g, '/'))?.id, null);
    await assert.rejects(f.manager.review(workspace.id, 'keep'), /account/);
    f.account.current!.userId = 'owner';
    await git(workspace.path, 'checkout', '--detach');
    await assert.rejects(f.manager.review(workspace.id, 'keep'), /branch changed/);
  } finally { await f.dispose(); }
});

test('diverged main and locked worktrees never merge or delete; Git-read errors remain unavailable', async () => {
  const f = await worktreeFixture();
  try {
    const workspace = await f.manager.create(f.request); f.finished(workspace.path);
    writeFileSync(join(workspace.path, 'other.txt'), 'branch'); await git(workspace.path, 'add', '.'); await git(workspace.path, 'commit', '-m', 'branch');
    writeFileSync(join(f.root, 'main.txt'), 'main'); await git(f.root, 'add', '.'); await git(f.root, 'commit', '-m', 'main');
    assert.match((await f.manager.review(workspace.id, 'merge')).reason!, /diverged/);
    await git(f.root, 'worktree', 'lock', workspace.path);
    assert.match((await f.manager.review(workspace.id, 'remove')).reason!, /locked/);
    await git(f.root, 'worktree', 'unlock', workspace.path);
    await git(f.root, 'branch', '-m', 'main', 'renamed-main');
    const result = (await f.manager.list())[0];
    assert.equal(result.available, false); assert.deepEqual(result.worktrees, []); assert.ok(result.reason);
  } finally { await f.dispose(); }
});

test('a missing external Git worktree is unavailable without disabling healthy project creation', async () => {
  const f = await worktreeFixture();
  try {
    const missing = join(f.dir, 'external');
    await git(f.root, 'worktree', 'add', '-b', 'external', missing, 'main');
    assert.ok(missing.startsWith(f.dir)); rmSync(missing, { recursive: true });
    const project = (await f.manager.list())[0];
    assert.equal(project.available, true);
    const row = project.worktrees.find((item) => item.branch === 'external')!;
    assert.equal(row.dirty, null); assert.ok(row.unavailable);
    assert.ok((await f.manager.create(f.request)).branch.startsWith('test/isolated-workspace-'));
  } finally { await f.dispose(); }
});
