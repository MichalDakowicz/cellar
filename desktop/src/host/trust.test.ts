import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { isTrusted, trustFolder, trustKey, withTrust } from './trust.ts';

test('keys a folder the way claude does', () => {
  assert.equal(trustKey('C:\\ping\\bazaar\\'), 'C:/ping/bazaar');
});

test('trusts one folder and leaves every other key alone', () => {
  const config = {
    numStartups: 4,
    projects: { 'C:/ping': { hasTrustDialogAccepted: true }, 'C:/ping/bazaar': { allowedTools: ['Bash'], hasTrustDialogAccepted: false } },
  };
  const next = withTrust(config, 'C:\\ping\\bazaar');
  assert.equal(isTrusted(next, 'C:\\ping\\bazaar'), true);
  assert.deepEqual(next.projects?.['C:/ping/bazaar']?.allowedTools, ['Bash']);
  assert.deepEqual(next.projects?.['C:/ping'], { hasTrustDialogAccepted: true });
  assert.equal(next.numStartups, 4);
  assert.equal(isTrusted(config, 'C:\\ping\\bazaar'), false);
});

test('writes the file atomically and keeps a copy of what was there', () => {
  const dir = mkdtempSync(join(tmpdir(), 'desk-trust-'));
  const file = join(dir, '.claude.json');
  writeFileSync(file, JSON.stringify({ projects: {} }));
  trustFolder('C:\\ping\\radar', file);
  assert.equal(isTrusted(JSON.parse(readFileSync(file, 'utf8')), 'C:\\ping\\radar'), true);
  assert.deepEqual(JSON.parse(readFileSync(`${file}.cellar-backup`, 'utf8')), { projects: {} });
});
