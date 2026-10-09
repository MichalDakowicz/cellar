import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { signDeskRequest } from '@/lib/deskSign';

import { Signatures } from './verify.ts';

const KEY = 'k3Y_secret-abcdefghijklmnopqrstuvwxyz012';
const sha256 = async (data: Uint8Array) => new Uint8Array(createHash('sha256').update(data).digest());
const sign = (over: Partial<{ method: string; path: string; body: string; ts: number; nonce: string; key: string }> = {}) =>
  signDeskRequest({ key: KEY, method: 'POST', path: '/runs', body: '{"a":1}', ts: 1_791_546_100_000, nonce: 'ab'.repeat(8), sha256, ...over });

test('accepts what the phone signed, once', async () => {
  const sigs = new Signatures(() => 1_791_546_100_500);
  const header = await sign();
  assert.ok(sigs.verify({ header, method: 'POST', path: '/runs', body: '{"a":1}', key: KEY }));
  assert.equal(sigs.verify({ header, method: 'POST', path: '/runs', body: '{"a":1}', key: KEY }), false);
});

test('refuses a changed body, path, method or key', async () => {
  const sigs = new Signatures(() => 1_791_546_100_000);
  const header = await sign({ nonce: 'cd'.repeat(8) });
  const base = { header, method: 'POST', path: '/runs', body: '{"a":1}', key: KEY };
  assert.equal(sigs.verify({ ...base, body: '{"a":2}' }), false);
  assert.equal(sigs.verify({ ...base, path: '/runs/x/stop' }), false);
  assert.equal(sigs.verify({ ...base, method: 'GET' }), false);
  assert.equal(sigs.verify({ ...base, key: `${KEY}x` }), false);
});

test('refuses a request more than a minute off the pc clock', async () => {
  const sigs = new Signatures(() => 1_791_546_100_000 + 61_000);
  const header = await sign({ nonce: 'ef'.repeat(8) });
  assert.equal(sigs.verify({ header, method: 'POST', path: '/runs', body: '{"a":1}', key: KEY }), false);
});

test('refuses a bearer key', () => {
  const sigs = new Signatures();
  assert.equal(sigs.verify({ header: `Bearer ${KEY}`, method: 'GET', path: '/desk', body: '', key: KEY }), false);
});
