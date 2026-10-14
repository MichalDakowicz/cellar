import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ScreenControl } from './screenControl.ts';
import { Tickets } from './tickets.ts';
test('PC consent, once-only input, expiry, trust and revocation bind account and pairing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-screen-')); let owner = 'one'; let key = 'key'; let locked = false; let now = 0; let decision: 'deny' | 'once' | 'trust' = 'deny'; let asks = 0; let inputs = 0;
  try {
    const adapter = { aspect: () => 2, input: async () => { inputs++; }, locked: () => locked, confirm: async () => { asks++; return decision; } };
    const screen = new ScreenControl(dir, () => ({ owner, key }), adapter, () => now);
    await assert.rejects(screen.open('phone'), /declined/);
    decision = 'once'; const access = await screen.open('phone');
    await screen.input({ id: access.id, sequence: 1, input: { kind: 'key', key: 'Tab' } });
    await assert.rejects(screen.input({ id: access.id, sequence: 1, input: { kind: 'key', key: 'Tab' } }), /already handled/); assert.equal(inputs, 1);
    locked = true; assert.equal(screen.valid(access.id), false); locked = false;
    owner = 'two'; assert.equal(screen.valid(access.id), false); owner = 'one';
    key = 'new'; assert.equal(screen.valid(access.id), false); key = 'key';
    now = access.expiresAt; assert.equal(screen.valid(access.id), false);
    decision = 'trust'; const trusted = await screen.open('phone'); const asked = asks;
    const restart = new ScreenControl(dir, () => ({ owner, key }), adapter, () => now);
    assert.equal(restart.valid(trusted.id), false); await restart.open('phone'); assert.equal(asks, asked);
    restart.forget(); decision = 'deny'; await assert.rejects(restart.open('phone'), /declined/);
    screen.release(access.id); assert.equal(screen.valid(access.id), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('preview cookies cannot authorize screen sessions', () => {
  const tickets = new Tickets(); const preview = tickets.openSession('pc');
  assert.equal(tickets.screenSession(preview, 'pc'), null);
  const screen = tickets.openSession('pc', 'lease'); assert.equal(tickets.screenSession(screen, 'pc'), 'lease');
  assert.equal(tickets.screenSession(screen, 'other'), null); tickets.clear(); assert.equal(tickets.screenSession(screen, 'pc'), null);
});
test('video offers require current consent and close peers after release or revocation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-video-')); const closed: string[] = [];
  try {
    const screen = new ScreenControl(dir, () => ({ owner: 'owner', key: 'key' }), { aspect: () => 2, input: async () => {}, locked: () => false, confirm: async () => 'once', answer: async () => ({ type: 'answer', sdp: 'v=0' }), closePeer: (id) => closed.push(id) });
    await assert.rejects(screen.answer('unknown', { type: 'offer', sdp: 'v=0' }), /consent/);
    const lease = await screen.open('phone');
    await assert.rejects(screen.answer(lease.id, { type: 'answer', sdp: 'v=0' }), /offer/);
    assert.equal((await screen.answer(lease.id, { type: 'offer', sdp: 'v=0' })).type, 'answer');
    screen.release(lease.id); assert.deepEqual(closed, [lease.id]); await assert.rejects(screen.answer(lease.id, { type: 'offer', sdp: 'v=0' }), /consent/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('display changes bind video and input to the same current monitor and require consent', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cellar-displays-')); const inputDisplays: (string | undefined)[] = []; const videoDisplays: (string | undefined)[] = []; let closed = 0;
  let displays = [{ id: '1', name: 'Main', aspect: 2, primary: true }, { id: '2', name: 'Portrait', aspect: 0.5, primary: false }];
  try {
    const control = new ScreenControl(dir, () => ({ owner: 'owner', key: 'key' }), { displays: () => displays, aspect: () => 2, input: async (_, display) => { inputDisplays.push(display); }, locked: () => false, confirm: async () => 'once', answer: async (_, __, display) => { videoDisplays.push(display); return { type: 'answer', sdp: 'v=0' }; }, closePeer: () => { closed++; } });
    const first = await control.open('phone'); assert.equal(first.displayId, '1');
    await assert.rejects(control.select({ id: 'unknown', displayId: '2' }), /consent/);
    await assert.rejects(control.select({ id: first.id, displayId: 'missing' }), /unavailable/);
    const second = await control.select({ id: first.id, displayId: '2' }); assert.equal(second.aspect, 0.5); assert.equal(closed, 1);
    await control.answer(first.id, { type: 'offer', sdp: 'v=0' }); await control.input({ id: first.id, sequence: 1, input: { kind: 'tap', x: 0.5, y: 0.5 } });
    assert.deepEqual(inputDisplays, ['2']); assert.deepEqual(videoDisplays, ['2']);
    displays = displays.slice(0, 1); await assert.rejects(control.input({ id: first.id, sequence: 2, input: { kind: 'tap', x: 0.5, y: 0.5 } }), /disconnected/);
    control.release(first.id);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
