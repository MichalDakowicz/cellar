import assert from 'node:assert/strict';
import { test } from 'node:test';
import { worktreeEnv } from './worktreeEnv.ts';

test('managed Git trust is exact, process scoped and preserves inherited configuration', () => {
  const inherited = { PATH: 'tools', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'core.autocrlf', GIT_CONFIG_VALUE_0: 'false' };
  const result = worktreeEnv('C:\\work with spaces\\one', inherited);
  assert.equal(result.GIT_CONFIG_COUNT, '2');
  assert.equal(result.GIT_CONFIG_KEY_0, 'core.autocrlf');
  assert.equal(result.GIT_CONFIG_VALUE_0, 'false');
  assert.equal(result.GIT_CONFIG_KEY_1, 'safe.directory');
  assert.equal(result.GIT_CONFIG_VALUE_1, 'C:/work with spaces/one');
  assert.equal(result.PATH, 'tools');
  assert.equal(inherited.GIT_CONFIG_COUNT, '1');
  assert.equal(worktreeEnv('/one', {}).GIT_CONFIG_VALUE_0, '/one');
});

test('malformed inherited Git configuration is refused', () => {
  for (const count of ['x', '-1', '1.5', '1001']) assert.throws(() => worktreeEnv('/one', { GIT_CONFIG_COUNT: count }), /Invalid inherited/);
});
