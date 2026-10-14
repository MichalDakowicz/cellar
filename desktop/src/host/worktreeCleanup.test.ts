import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import type { HostDeps } from './api.ts';
import { git } from './worktreeGit.ts';
import { worktreeFixture } from './worktreeFixture.ts';
import { Worktrees } from './worktrees.ts';
import { WorktreeCleanup } from './worktreeCleanup.ts';

test('closed clean tasks lose only their checkout; unmerged branch commits survive restart', async () => {
  const f = await worktreeFixture();
  try {
    const tree = await f.manager.create(f.request);
    writeFileSync(join(tree.path, 'file.txt'), 'committed result\n');
    await git(tree.path, 'add', '.'); await git(tree.path, 'commit', '-m', 'task result');
    const head = await git(tree.path, 'rev-parse', 'HEAD');
    f.finished(tree.path);
    const restarted = new Worktrees(f.data, f.account, async () => f.runs);
    assert.deepEqual(await restarted.cleanup(() => false), [tree.id]);
    assert.equal(existsSync(tree.path), false);
    assert.equal(await git(f.root, 'rev-parse', tree.branch), head);
    assert.equal(readFileSync(join(f.root, 'file.txt'), 'utf8'), 'base\n');
    assert.deepEqual(await restarted.cleanup(() => false), []);
  } finally { await f.dispose(); }
});

test('dirty completed work is recoverable with staged, unstaged and untracked contents intact', async () => {
  const f = await worktreeFixture();
  try {
    const tree = await f.manager.create(f.request);
    writeFileSync(join(tree.path, 'file.txt'), 'staged\n'); await git(tree.path, 'add', 'file.txt');
    writeFileSync(join(tree.path, 'file.txt'), 'unstaged\n');
    writeFileSync(join(tree.path, 'new.txt'), 'untracked\n');
    f.finished(tree.path);
    assert.deepEqual(await f.manager.cleanup(() => false), [tree.id]);
    const ref = `refs/cellar/archives/${tree.id}`;
    assert.equal(await git(f.root, 'show', `${ref}:file.txt`), 'unstaged');
    assert.equal(await git(f.root, 'show', `${ref}^2:file.txt`), 'staged');
    assert.equal(await git(f.root, 'show', `${ref}^3:new.txt`), 'untracked');
    assert.equal(existsSync(tree.path), false);
    const recovered = join(f.dir, 'recovered');
    await git(f.root, 'worktree', 'add', recovered, tree.branch);
    await git(recovered, 'stash', 'apply', '--index', ref);
    assert.equal(readFileSync(join(recovered, 'file.txt'), 'utf8'), 'unstaged\n');
    assert.equal(readFileSync(join(recovered, 'new.txt'), 'utf8'), 'untracked\n');
    assert.equal(await git(recovered, 'show', ':file.txt'), 'staged');
  } finally { await f.dispose(); }
});

test('live sessions, queued turns, unknown runs and nested jobs block automatic cleanup', async () => {
  const f = await worktreeFixture();
  try {
    const tree = await f.manager.create(f.request); f.finished(tree.path);
    let live = true; let queued = false;
    const deps = { account: f.account, worktrees: f.manager,
      runs: { runtime: { has: () => live } },
      controls: { queue: () => ({ items: queued ? [{}] : [] }) } } as unknown as HostDeps;
    const cleanup = new WorktreeCleanup(deps);
    await cleanup.tick(); assert.equal(existsSync(tree.path), true);
    live = false; queued = true;
    await cleanup.tick(); assert.equal(existsSync(tree.path), true);
    queued = false;
    for (const state of ['running', 'waiting', 'unknown'] as const) {
      f.runs[0].state = state; await cleanup.tick(); assert.equal(existsSync(tree.path), true);
    }
    f.runs[0].state = 'done';
    f.runs.push({ ...f.runs[0], id: 'job', worktreeId: undefined, cwd: join(tree.path, 'desktop'), state: 'running', agent: 'job' });
    await cleanup.tick(); assert.equal(existsSync(tree.path), true);
    f.runs[1].state = 'done';
    await cleanup.tick(); assert.equal(existsSync(tree.path), false);
    await cleanup.stop();
  } finally { await f.dispose(); }
});

test('missing run evidence, Keep, Git locks, foreign owners and ignored local files retain folders', async () => {
  const f = await worktreeFixture();
  try {
    const tree = await f.manager.create(f.request);
    assert.deepEqual(await f.manager.cleanup(() => false), []);
    f.finished(tree.path);
    f.account.current!.userId = 'other';
    assert.deepEqual(await f.manager.cleanup(() => false), []);
    f.account.current!.userId = 'owner';
    await git(f.root, 'worktree', 'lock', tree.path);
    assert.deepEqual(await f.manager.cleanup(() => false), []);
    await git(f.root, 'worktree', 'unlock', tree.path);
    writeFileSync(join(tree.path, '.gitignore'), '.env\nnode_modules/\n');
    writeFileSync(join(tree.path, '.env'), 'private data');
    assert.deepEqual(await f.manager.cleanup(() => false), []);
    assert.equal(readFileSync(join(tree.path, '.env'), 'utf8'), 'private data');
    const review = await f.manager.review(tree.id, 'keep');
    await f.manager.act({ commandId: randomUUID(), worktreeId: tree.id, action: 'keep', token: review.token });
    assert.deepEqual(await f.manager.cleanup(() => false), []);
    assert.equal(existsSync(tree.path), true);
  } finally { await f.dispose(); }
});

test('generated dependencies do not prevent cleanup or enter Git snapshots', async () => {
  const f = await worktreeFixture();
  try {
    const tree = await f.manager.create(f.request); f.finished(tree.path);
    writeFileSync(join(tree.path, '.gitignore'), 'node_modules/\n.gradle/\n');
    await git(tree.path, 'add', '.gitignore'); await git(tree.path, 'commit', '-m', 'ignore dependencies');
    writeFileSync(join(tree.path, 'file.txt'), 'finished edit\n');
    mkdirSync(join(tree.path, 'node_modules')); writeFileSync(join(tree.path, 'node_modules', 'generated.js'), 'dependency');
    const gradle = join(tree.path, 'modules', 'native', 'android', '.gradle');
    mkdirSync(gradle, { recursive: true }); writeFileSync(join(gradle, 'cache.bin'), 'generated cache');
    assert.deepEqual(await f.manager.cleanup(() => false), [tree.id]);
    assert.equal(existsSync(tree.path), false);
    const ref = `refs/cellar/archives/${tree.id}`;
    await assert.rejects(git(f.root, 'show', `${ref}^3:node_modules/generated.js`));
    await assert.rejects(git(f.root, 'show', `${ref}^3:modules/native/android/.gradle/cache.bin`));
  } finally { await f.dispose(); }
});
