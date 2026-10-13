import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { worktreeFixture, projectId } from './worktreeFixture.ts';
import { Runs } from './runs.ts';
import { searchKeys } from './keySearch.ts';
import { keyFiles, checkedKeyPath, relativeKeyPath, insideKeyRoot } from './keyFiles.ts';
import { agentSkillRoots, keySkills } from './keySkills.ts';
import { handle, type HostDeps } from './api.ts';
import { previewKey } from './keyPreview.ts';
import { git } from './worktreeGit.ts';

test('path boundary excludes absolute/traversal/ADS/sibling prefixes and redirected folders', async () => {
  const f = await worktreeFixture();
  try {
    for (const path of ['../secret', 'a/../../secret', '/secret', 'C:/secret', 'file.txt:stream', 'a\\b', 'a/./b', 'a\0b', 'a//b']) assert.equal(relativeKeyPath(path), false, path);
    assert.equal(insideKeyRoot(f.root, `${f.root}-other/file`), false);
    assert.equal(insideKeyRoot(f.root, f.root), false);
    const outside = join(f.dir, 'outside'); mkdirSync(outside); writeFileSync(join(outside, 'secret.txt'), 'private');
    symlinkSync(outside, join(f.root, 'redirect'), 'junction');
    assert.equal(await checkedKeyPath(f.root, 'redirect/secret.txt'), null);
    assert.equal(await checkedKeyPath(f.root, '../outside/secret.txt'), null);
    assert.ok(await checkedKeyPath(f.root, 'file.txt'));
    assert.equal(await checkedKeyPath(f.root, 'gone.txt'), null);
  } finally { await f.dispose(); }
});

test('Git catalogue includes changed/untracked and folders; ignores excluded output and redirected targets', async () => {
  const f = await worktreeFixture();
  try {
    mkdirSync(join(f.root, 'src')); writeFileSync(join(f.root, 'src', 'new file.ts'), 'new');
    writeFileSync(join(f.root, 'file.txt'), 'changed');
    writeFileSync(join(f.root, '.gitignore'), 'ignored/\n'); mkdirSync(join(f.root, 'ignored')); writeFileSync(join(f.root, 'ignored', 'secret'), 'private');
    const result = await keyFiles(f.root);
    assert.ok(result.files.some((row) => row.path === 'file.txt' && row.changed));
    assert.ok(result.files.some((row) => row.path === 'src/new file.ts' && row.changed));
    assert.ok(result.files.some((row) => row.path === 'src/'));
    assert.ok(!result.files.some((row) => row.path.startsWith('ignored/')));
  } finally { await f.dispose(); }
});

test('search refuses cross owner/project/agent/run and validates managed worktree before enumeration', async () => {
  const f = await worktreeFixture();
  try {
    const tree = await f.manager.create(f.request);
    writeFileSync(join(tree.path, 'owned.ts'), 'owned');
    const record = { id: 'abcdef01', owner: 'owner', projectId, agent: 'codex', cwd: tree.path, worktreeId: tree.id, where: 'worktree', commandId: f.request.commandId };
    writeFileSync(join(f.data, 'runs.json'), JSON.stringify([record]));
    const deps = { account: f.account, worktrees: f.manager, runs: new Runs(f.data, async () => [], () => f.account.current?.userId ?? null) } as HostDeps;
    const body = { key: '@', query: 'owned:42', projectId, agent: 'codex', runId: record.id };
    assert.equal((await searchKeys(deps, body)).suggestions[0].insert, '@owned.ts:42');
    assert.equal((await previewKey(deps, { ...body, path: 'owned.ts', line: 1 })).text, '1  owned');
    await assert.rejects(previewKey(deps, { ...body, path: '../../secret', line: 1 }), /unavailable/);
    writeFileSync(join(tree.path, '.gitignore'), 'hidden.txt\n'); writeFileSync(join(tree.path, 'hidden.txt'), 'hidden');
    await assert.rejects(previewKey(deps, { ...body, path: 'hidden.txt', line: 1 }), /unavailable/);
    writeFileSync(join(tree.path, 'binary.bin'), Buffer.from([0, 1, 2]));
    await assert.rejects(previewKey(deps, { ...body, path: 'binary.bin', line: 1 }), /Binary/);
    await assert.rejects(previewKey(deps, { ...body, path: 'owned.ts', line: 0 }), /valid line/);
    for (const patch of [{ projectId: '00000000-0000-4000-8000-000000000099' }, { agent: 'claude' }, { runId: 'badbad00' }]) await assert.rejects(searchKeys(deps, { ...body, ...patch }));
    f.account.current!.userId = 'other';
    await assert.rejects(searchKeys(deps, body), /owned/);
    f.account.current!.userId = 'owner';
    record.cwd = f.root;
    writeFileSync(join(f.data, 'runs.json'), JSON.stringify([record]));
    deps.runs = new Runs(f.data, async () => [], () => 'owner');
    await assert.rejects(searchKeys(deps, body), /scope/);
    assert.match((await searchKeys(deps, { ...body, runId: undefined })).notice!, /selected run/);
  } finally { f.account.current!.userId = 'owner'; await f.dispose(); }
});

test('account change while project check is in flight fails without returning files', async () => {
  const f = await worktreeFixture();
  try {
    const original = f.account.commandProjects.bind(f.account);
    f.account.commandProjects = async () => { const result = await original(); f.account.current!.userId = 'other'; return result; };
    await assert.rejects(searchKeys({ account: f.account } as HostDeps, { key: '@', query: '', projectId, agent: 'codex' }), /Account changed/);
    f.account.commandProjects = original;
  } finally { f.account.current!.userId = 'owner'; await f.dispose(); }
});

test('committed worktree changes keep changed-first status after the working tree becomes clean', async () => {
  const f = await worktreeFixture();
  try {
    const tree = await f.manager.create(f.request);
    writeFileSync(join(tree.path, 'committed.ts'), 'new committed file');
    await git(tree.path, 'add', 'committed.ts');
    await git(tree.path, 'commit', '-m', 'add file in run');
    const result = await keyFiles(tree.path);
    assert.deepEqual(result.files.find((row) => row.path === 'committed.ts'), { path: 'committed.ts', changed: true });
    assert.deepEqual(result.files.find((row) => row.path === 'file.txt'), { path: 'file.txt', changed: false });
  } finally { await f.dispose(); }
});

test('skills follow agent roots, include built-in/user metadata, exclude links and never load credentials', async () => {
  const f = await worktreeFixture();
  try {
    const skills = join(f.dir, 'skills'); mkdirSync(join(skills, '.system', 'built'), { recursive: true }); mkdirSync(join(skills, 'mine'));
    writeFileSync(join(skills, '.system', 'built', 'SKILL.md'), '---\nname: built\ndescription: Built in fixture\n---\n');
    writeFileSync(join(skills, 'mine', 'SKILL.md'), '---\nname: own-review\ndescription: User skill\n---\nSECRET BODY NEVER RETURNED');
    writeFileSync(join(skills, 'auth.json'), 'SECRET TOKEN');
    const result = await keySkills('codex', f.root, [skills]);
    assert.ok(result.skills.some((row) => row.name === 'review'));
    assert.ok(result.skills.some((row) => row.name === 'built' && row.detail.includes('built in')));
    assert.ok(result.skills.some((row) => row.name === 'own-review'));
    assert.ok(!JSON.stringify(result).includes('SECRET'));
    const outside = join(f.dir, 'foreign-agent'); mkdirSync(join(outside, 'skills', 'foreign'), { recursive: true });
    writeFileSync(join(outside, 'skills', 'foreign', 'SKILL.md'), '---\nname: foreign-skill\n---\n');
    symlinkSync(outside, join(f.root, '.agents'), 'junction');
    const redirected = await keySkills('codex', f.root, [join(f.root, '.agents', 'skills')]);
    assert.ok(!redirected.skills.some((row) => row.name === 'foreign-skill'));
    assert.match(redirected.notice!, /redirected/);
    assert.ok(agentSkillRoots('claude', f.root, f.dir, {}).every((path) => !path.includes('.codex')));
    assert.ok(agentSkillRoots('codex', f.root, f.dir, { CODEX_HOME: join(f.dir, 'custom') }).some((path) => path.startsWith(join(f.dir, 'custom'))));
    assert.match((await keySkills('agy', f.root, [])).notice!, /no supported/);
  } finally { await f.dispose(); }
});

test('API returns explicit invalid/sign-out refusals and W2 catalogue matches without executing jobs', async () => {
  const f = await worktreeFixture();
  try {
    const deps = { account: f.account, commands: { list: async () => [{ id: projectId, commands: [{ id: 'test' }, { id: 'apk' }] }] } } as unknown as HostDeps;
    const body = { key: '$', query: 'te', projectId, agent: 'codex' };
    assert.equal((await searchKeys(deps, body)).suggestions[0].insert, '$test');
    assert.equal((await handle(deps, { method: 'POST', path: '/keys-search', body: { ...body, projectId: '../' } })).status, 400);
    Object.assign(f.account, { current: null });
    assert.equal((await handle(deps, { method: 'POST', path: '/keys-search', body })).status, 409);
    Object.assign(f.account, { current: { userId: 'owner' } });
  } finally { await f.dispose(); }
});
