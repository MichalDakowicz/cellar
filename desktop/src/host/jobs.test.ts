import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { Commands } from './commands.ts';
import { Jobs } from './jobs.ts';

test('real scripts become jobs: confirmed exits, failed chains, logs, reload and ownership', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-jobs-'));
  const project = join(dir, 'project');
  mkdirSync(project);
  writeFileSync(join(project, 'package.json'), JSON.stringify({ scripts: { ok: 'node ok.cjs', bad: 'node bad.cjs', slow: 'node slow.cjs' } }));
  writeFileSync(join(project, 'ok.cjs'), "console.log('job output'); require('fs').appendFileSync('steps.txt', 'ok\\n');");
  writeFileSync(join(project, 'bad.cjs'), "console.error('expected failure'); process.exit(7);");
  writeFileSync(join(project, 'slow.cjs'), "console.log('waiting'); setInterval(() => {}, 1000);");
  let owner: string | null = 'owner';
  const account = { get current() { return owner ? { userId: owner, accessToken: 'test' } : null; }, commandProjects: async () => [{ projectId: 'project', name: 'QA', path: project, root: false }] };
  const commands = new Commands(dir, account);
  const jobs = new Jobs(dir, () => owner);
  const until = async (id: string) => {
    for (let at = 0; at < 100; at++) {
      const run = jobs.list().find((row) => row.id === id)!;
      if (run.state !== 'running') return run;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error('job did not settle');
  };
  try {
    assert.equal((await commands.list())[0].commands[0].id, 'ok');
    await assert.rejects(commands.plan('other', 'ok'), /no folder/);
    await commands.save('project', [{ id: 'chain', steps: [{ runner: 'npm', task: 'ok' }, { runner: 'npm', task: 'bad' }, { runner: 'npm', task: 'ok' }] }]);
    const run = await jobs.start(await commands.plan('project', 'chain'), 'chain');
    assert.equal(run.agent, 'job');
    assert.equal((await until(run.id)).state, 'failed');
    assert.equal(readFileSync(join(project, 'steps.txt'), 'utf8'), 'ok\n');
    assert.match((await jobs.log(run.id)).map((line) => line.text).join('\n'), /expected failure/);
    const ok = await jobs.start(await commands.plan('project', 'ok'), 'ok');
    assert.equal((await until(ok.id)).state, 'done');
    if (process.platform === 'win32') {
      const gradle = join(project, 'android with spaces');
      mkdirSync(gradle);
      writeFileSync(join(gradle, 'gradlew.bat'), '@echo off\r\necho wrapper task %1\r\nexit /b 0\r\n');
      const apk = await jobs.start({ cwd: project, gradle, steps: [{ runner: 'gradle', task: 'assembleRelease' }] }, 'apk');
      assert.equal((await until(apk.id)).state, 'done');
      assert.match((await jobs.log(apk.id)).map((line) => line.text).join('\n'), /wrapper task assembleRelease/);
      if (process.env.JAVA_HOME && existsSync(join(process.env.JAVA_HOME, 'bin', 'java.exe'))) {
        writeFileSync(join(gradle, 'gradlew.bat'), '@echo off\r\n"%JAVA_HOME%\\bin\\java.exe" -version\r\nexit /b %errorlevel%\r\n');
        const java = await jobs.start({ cwd: project, gradle, steps: [{ runner: 'gradle', task: 'help' }] }, 'java-output');
        assert.equal((await until(java.id)).state, 'done');
        assert.match((await jobs.log(java.id)).map((line) => line.text).join('\n'), /(?:java|openjdk) version/);
      }
    }
    const slow = await jobs.start(await commands.plan('project', 'slow'), 'slow');
    const reloaded = new Jobs(dir, () => owner);
    assert.equal(reloaded.list().find((row) => row.id === slow.id)?.state, 'unknown');
    // Wait for the nested npm script to exist before exercising tree stop.
    for (let at = 0; at < 100 && !(await jobs.log(slow.id)).some((line) => line.text === 'waiting'); at++)
      await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok((await jobs.log(slow.id)).some((line) => line.text === 'waiting'));
    await jobs.stop(slow.id);
    assert.equal((await until(slow.id)).state, 'stopped');
    owner = 'other';
    assert.equal(jobs.list().length, 0);
    await assert.rejects(jobs.log(run.id), /no such job/);
    assert.equal((await commands.list())[0].overrides!.length, 0);
    owner = null;
    await assert.rejects(commands.plan('project', 'ok'), /sign in/);
  } finally {
    assert.ok(dir.startsWith(join(tmpdir(), 'cellar-jobs-')));
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
