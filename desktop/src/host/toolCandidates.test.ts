import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executableCandidates } from './tools.ts';
test('Codex GUI on PATH never shadows native CLI or qualifies as a provider', () => {
  const gui = 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_1\\app\\Codex.exe';
  const cli = 'C:\\tools\\codex.exe';
  assert.deepEqual(executableCandidates('codex', [gui, 'C:\\tools\\codex.cmd', cli]), [cli]);
  assert.deepEqual(executableCandidates('codex', [gui]), []);
});
