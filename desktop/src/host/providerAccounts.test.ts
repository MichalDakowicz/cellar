import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProviderAccounts } from './providerAccounts.ts';
import type { DeskStart } from '@/lib/deskProtocol';

test('account secrets stay encrypted, metadata scoped, env/config dirs isolated per run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-accounts-')); let owner = 'owner';
  const vault = { available: () => true, encrypt: (s: string) => Buffer.from(s.split('').reverse().join('')), decrypt: (s: Buffer) => s.toString().split('').reverse().join('') };
  try {
    const store = new ProviderAccounts(dir, () => owner, vault);
    const key = 'test-fake-secret-value'; const [account] = store.save({ agent: 'codex', label: 'work', key });
    assert.ok(!JSON.stringify(account).includes(key)); assert.ok(!readFileSync(join(dir, 'provider-accounts.json'), 'utf8').includes(key));
    const start = { agent: 'codex', accountId: account.id } as DeskStart;
    const env = store.environment(start, 'abcdef01', { ANTHROPIC_API_KEY: 'foreign', CODEX_ACCESS_TOKEN: 'foreign' });
    assert.equal(env.OPENAI_API_KEY, key); assert.equal(env.ANTHROPIC_API_KEY, undefined); assert.equal(env.CODEX_ACCESS_TOKEN, undefined);
    assert.notEqual(env.CODEX_HOME, store.environment(start, 'abcdef02', {}).CODEX_HOME);
    owner = 'other'; assert.equal(store.list().length, 0); assert.throws(() => store.environment(start, 'abcdef03', {}));
    assert.throws(() => new ProviderAccounts(dir, () => owner).save({ agent: 'claude', label: 'x', key }));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
