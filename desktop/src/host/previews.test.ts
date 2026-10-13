import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { worktreeFixture, projectId } from './worktreeFixture.ts';
import { Commands } from './commands.ts';
import { Jobs } from './jobs.ts';
import { Runs } from './runs.ts';
import { Previews } from './previews.ts';
import type { HostDeps } from './api.ts';
import type { PreviewAction } from '@/lib/deskManagedPreview';

test('managed preview uses owned worktree, one server, real checks and once-only deploy', async () => {
  const f = await worktreeFixture();
  const tree = await f.manager.create(f.request);
  writeFileSync(join(tree.path, 'package.json'), JSON.stringify({ scripts: {
    dev: 'node server.cjs --fixture vite', test: 'node -e "process.exit(7)"', deploy: 'node deploy.cjs',
  } }));
  writeFileSync(join(tree.path, 'server.cjs'), "const at=process.argv.indexOf('--port'); require('http').createServer((q,s)=>s.end('owned preview')).listen(Number(process.argv[at+1]),'127.0.0.1');");
  writeFileSync(join(tree.path, 'deploy.cjs'), "require('fs').appendFileSync('deploy-count.txt', 'once\\n');");
  writeFileSync(join(f.data, 'runs.json'), JSON.stringify([{ id: 'abcdef01', owner: 'owner', projectId, agent: 'codex', cwd: tree.path, worktreeId: tree.id, where: 'worktree', commandId: f.request.commandId }]));
  const deps = { account: f.account, worktrees: f.manager,
    runs: new Runs(f.data, async () => [], () => f.account.current?.userId ?? null),
    jobs: new Jobs(f.data, () => f.account.current?.userId ?? null), commands: new Commands(f.data, f.account) } as HostDeps;
  const previews = new Previews(f.data, deps);
  const action = (kind: PreviewAction['action']): PreviewAction => ({ commandId: randomUUID(), projectId, runId: 'abcdef01', action: kind });
  try {
    const [first, second] = await Promise.all([previews.act(action('start')), previews.act(action('start'))]);
    assert.equal(first.state, 'confirmed'); assert.equal(first.preview?.jobId, second.preview?.jobId);
    assert.equal(deps.jobs!.list().filter((j) => j.state === 'running').length, 1);
    assert.equal(first.preview?.cwd, tree.path);
    assert.equal((await previews.act(action('deploy'))).state, 'failed');
    assert.equal(deps.jobs!.list().some((j) => j.name === '$deploy'), false);
    previews.opened(first.preview!.port);
    const deploy = action('deploy');
    const [sent, retry] = await Promise.all([previews.act(deploy), previews.act(deploy)]);
    assert.equal(sent.preview?.deployJobId, retry.preview?.deployJobId);
    await previews.act(action('checks'));
    for (let i = 0; i < 100 && deps.jobs!.list().some((j) => j.name !== '$dev' && j.state === 'running'); i++) await new Promise((r) => setTimeout(r, 50));
    assert.equal(readFileSync(join(tree.path, 'deploy-count.txt'), 'utf8'), 'once\n');
    assert.equal(deps.jobs!.list().find((j) => j.name === '$test')?.state, 'failed');
    assert.equal(previews.receipt(deploy.commandId)?.state, 'confirmed');
    assert.equal((await previews.act({ ...action('start'), projectId: randomUUID() })).state, 'failed');
    assert.equal((await previews.act(action('stop'))).state, 'confirmed');
    assert.equal(previews.list()[0].state, 'stopped');
    f.account.current!.userId = 'other'; assert.equal(previews.list().length, 0); assert.equal(previews.receipt(deploy.commandId), null);
  } finally {
    f.account.current!.userId = 'owner'; await previews.close();
    // Test files are intentional untracked content in a disposable fixture.
    const { git } = await import('./worktreeGit.ts'); await git(f.root, 'worktree', 'remove', '--force', tree.path);
    await f.dispose();
  }
});
