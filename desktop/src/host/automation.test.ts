import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Automation } from './automation.ts';
import type { HostDeps } from './api.ts';

test('managed rules require unchanged reviewed files, preserve user instructions and isolate accounts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-rules-')); let owner = 'owner'; const entryId = '11111111-1111-4111-a111-111111111111';
  const deps = { account: { get current() { return { userId: owner }; }, ruleContext: async () => ({ projects: [{ id: 'p', shelfId: 's', repoPath: dir }], entries: [{ id: entryId, text: 'keep changes small', archived: false }] }) } } as unknown as HostDeps;
  try {
    writeFileSync(join(dir, 'CLAUDE.md'), 'user instruction\n'); const rules = new Automation(dir, deps);
    await rules.save({ recipes: {}, rules: [{ entryId, scope: 'everywhere', scopeId: null }] });
    const review = await rules.review('p'); assert.ok(review.files[1].diff.includes('keep changes small'));
    writeFileSync(join(dir, 'CLAUDE.md'), 'changed elsewhere\n'); await assert.rejects(rules.apply('p', review.token), /review again/);
    const next = await rules.review('p'); await rules.apply('p', next.token);
    assert.ok(readFileSync(join(dir, 'CLAUDE.md'), 'utf8').startsWith('changed elsewhere\n'));
    owner = 'other'; assert.equal(rules.read().rules.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
