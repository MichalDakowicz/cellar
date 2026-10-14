import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { claudeProjectSlug } from './agents.ts';
import { forkClaudeSession } from './claudeFork.ts';

test('real SDK transcript fork uses isolated account config without invoking Claude or changing source', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-claude-fork-')); const config = join(dir, 'account-config'); const cwd = join(dir, 'project'); mkdirSync(cwd);
  const folder = join(config, 'projects', claudeProjectSlug(cwd)); mkdirSync(folder, { recursive: true });
  const sid = randomUUID(); const first = randomUUID(); const second = randomUUID();
  const rows = [{ type: 'user', uuid: first, parentUuid: null, sessionId: sid, cwd, timestamp: new Date().toISOString(), message: { role: 'user', content: 'first' } },
    { type: 'assistant', uuid: second, parentUuid: first, sessionId: sid, cwd, timestamp: new Date().toISOString(), message: { role: 'assistant', content: [{ type: 'text', text: 'later' }] } }];
  const source = JSON.stringify(rows[0]) + '\n' + JSON.stringify(rows[1]) + '\n'; writeFileSync(join(folder, sid + '.jsonl'), source);
  try {
    const fork = await forkClaudeSession(sid, cwd, first, { ...process.env, CLAUDE_CONFIG_DIR: config });
    assert.notEqual(fork.sessionId, sid); assert.equal(readFileSync(join(folder, sid + '.jsonl'), 'utf8'), source);
    const files = readdirSync(folder); assert.ok(files.includes(fork.sessionId + '.jsonl'));
    const transcript = readFileSync(join(folder, fork.sessionId + '.jsonl'), 'utf8'); assert.ok(transcript.includes('first')); assert.ok(!transcript.includes('later'));
    assert.ok(transcript.includes(first), 'fork retains the checkpoint message UUID');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
