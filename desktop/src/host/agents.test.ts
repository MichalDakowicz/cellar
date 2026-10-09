import assert from 'node:assert/strict';
import { test } from 'node:test';

import { backgroundId, claudeProjectSlug, claudeRunState, spawnPlan, untrustedFolder } from './agents.ts';

const start = { prompt: '-rf looks like a flag', cwd: 'C:\\ping\\cellar', name: null, entryId: null };

test('every plan puts the prompt after -- so a leading dash stays a prompt', () => {
  for (const agent of ['claude', 'codex', 'agy'] as const) {
    const { args } = spawnPlan({ ...start, agent });
    assert.equal(args.at(-1), start.prompt);
    assert.equal(args.at(-2), '--');
  }
});

test('claude runs in the background, in auto mode, with no model pinned', () => {
  const plan = spawnPlan({ ...start, agent: 'claude' });
  assert.equal(plan.kind, 'background');
  assert.deepEqual(plan.args.slice(0, 5), ['--bg', '-n', '-rf looks like a flag', '--permission-mode', 'auto']);
  assert.ok(!plan.args.includes('--model'));
});

test('codex is told the folder itself', () => {
  const plan = spawnPlan({ ...start, agent: 'codex' });
  assert.equal(plan.kind, 'own');
  assert.equal(plan.args[plan.args.indexOf('-C') + 1], 'C:\\ping\\cellar');
});

test('reads the id claude --bg prints', () => {
  assert.equal(backgroundId('Starting background service…\nbackgrounded · 4a588420 · desk smoke test\n'), '4a588420');
  assert.equal(backgroundId('nothing here'), null);
  assert.ok(untrustedFolder('Workspace not trusted. Run `claude` in C:\\x once'));
});

test('maps claude states onto the phone vocabulary', () => {
  assert.equal(claudeRunState({ kind: 'background', state: 'blocked' }), 'waiting');
  assert.equal(claudeRunState({ kind: 'background', state: 'done', status: 'idle' }), 'done');
  assert.equal(claudeRunState({ kind: 'interactive', status: 'busy' }), 'running');
  assert.equal(claudeRunState({ kind: 'interactive', status: 'idle' }), 'waiting');
});

test('slugs a folder the way claude names its transcript folder', () => {
  assert.equal(claudeProjectSlug('C:\\ping'), 'C--ping');
  assert.equal(claudeProjectSlug('C:\\ping\\cellar'), 'C--ping-cellar');
});
