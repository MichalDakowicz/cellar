import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshot, restoreSnapshot, checkpointGit as git } from './checkpointGit.ts';

test('checkpoint restores staged, unstaged and untracked files without moving HEAD/index or secrets', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'cellar-checkpoint-test-'));
  try {
    await git(cwd, ['init', '-b', 'main']);
    await writeFile(join(cwd, 'tracked.txt'), 'base'); await git(cwd, ['add', '.']);
    await git(cwd, ['-c', 'user.name=test', '-c', 'user.email=test@localhost', 'commit', '-m', 'base']);
    const head = await git(cwd, ['rev-parse', 'HEAD']);
    await writeFile(join(cwd, 'tracked.txt'), 'staged'); await git(cwd, ['add', '.']);
    const index = await git(cwd, ['write-tree']);
    await writeFile(join(cwd, 'tracked.txt'), 'before'); await writeFile(join(cwd, 'untracked.txt'), 'untracked before');
    await writeFile(join(cwd, '.env'), 'SECRET=never save');
    const before = await snapshot(cwd, 'test');
    assert.equal(await git(cwd, ['write-tree']), index); assert.equal(await git(cwd, ['rev-parse', 'HEAD']), head);
    assert.doesNotMatch(await git(cwd, ['ls-tree', '-r', before.ref]), /\.env/);
    await writeFile(join(cwd, 'tracked.txt'), 'after'); await writeFile(join(cwd, 'new.txt'), 'remove on rollback');
    const after = await snapshot(cwd, 'test'); await restoreSnapshot(cwd, before.ref, after.ref);
    assert.equal(await readFile(join(cwd, 'tracked.txt'), 'utf8'), 'before');
    assert.equal(await readFile(join(cwd, 'untracked.txt'), 'utf8'), 'untracked before');
    await assert.rejects(readFile(join(cwd, 'new.txt'))); assert.equal(await git(cwd, ['write-tree']), index);
    assert.equal(await readFile(join(cwd, '.env'), 'utf8'), 'SECRET=never save');
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('restore refuses file replaced by a directory before altering any saved file', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'cellar-checkpoint-test-'));
  try {
    await git(cwd, ['init']); await writeFile(join(cwd, 'x'), 'before'); const before = await snapshot(cwd, 'test');
    await writeFile(join(cwd, 'x'), 'after'); const after = await snapshot(cwd, 'test');
    await rm(join(cwd, 'x')); await mkdir(join(cwd, 'x'));
    await assert.rejects(restoreSnapshot(cwd, before.ref, after.ref));
  } finally { await rm(cwd, { recursive: true, force: true }); }
});
