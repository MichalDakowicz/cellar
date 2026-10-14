import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneDevices, Phones } from './phones.ts';
import type { HostDeps } from './api.ts';
test('ADB discovery preserves unauthorized and offline devices', () => {
  assert.deepEqual(phoneDevices('List of devices attached\nabc device product:p model:Pixel_9\n192.168.1.2:5555 offline\nno unauthorized\n'), [
    { serial: 'abc', state: 'device', model: 'Pixel 9' }, { serial: '192.168.1.2:5555', state: 'offline', model: '192.168.1.2:5555' }, { serial: 'no', state: 'unauthorized', model: 'no' },
  ]);
});
test('phone input respects driver, account and live agent gates; shell data is quoted', async () => {
  let owner = 'one'; let permission = false; const seen: string[][] = [];
  const deps = { account: { get current() { return { userId: owner }; }, agentDevice: async () => permission }, runs: { list: async () => [{ id: 'run', state: 'running' }] } } as unknown as HostDeps;
  const execute = (async (_path: string, args: string[]) => { seen.push(args); return { stdout: args[0] === 'devices' ? 'List of devices attached\nabc device model:Pixel\n' : '', stderr: '' }; }) as unknown as ConstructorParameters<typeof Phones>[2];
  const phone = new Phones(deps, async () => 'adb', execute);
  await assert.rejects(phone.act({ serial: 'abc', action: 'tap', x: 1, y: 1 }, 'pc'), /I drive/);
  await phone.act({ serial: 'abc', action: 'driver', value: 'you' }, 'pc');
  await phone.act({ serial: 'abc', action: 'text', value: "hello'; reboot #" }, 'pc');
  assert.equal(seen.at(-1)![5], "'hello'\\'';%sreboot%s#'");
  await assert.rejects(phone.act({ serial: 'abc', action: 'tap', x: 1, y: 1, actor: 'agent', runId: 'run' }, 'pc'), /driver switch/);
  permission = true; await phone.act({ serial: 'abc', action: 'agentAccess', enabled: true }, 'pc'); await phone.act({ serial: 'abc', action: 'driver', value: 'agent' }, 'pc');
  await phone.act({ serial: 'abc', action: 'tap', x: 12, y: 34, actor: 'agent', runId: 'run' }, 'pc'); assert.equal((await phone.list()).taps.length, 1);
  const token = phone.environment('one', 'run', 47821).CELLAR_PHONE_TOKEN;
  await phone.agent(token, { action: 'tap', serial: 'abc', x: 2, y: 3, sequence: 1 });
  await assert.rejects(phone.agent(token, { action: 'tap', serial: 'abc', x: 2, y: 3, sequence: 1 }), /sequence/);
  permission = false; await assert.rejects(phone.agent(token, { action: 'tap', serial: 'abc', x: 2, y: 3, sequence: 2 }), /disabled/);
  owner = 'two'; assert.equal((await phone.list()).driver, 'watch'); assert.equal((await phone.list()).agentAccess, false);
  await assert.rejects(phone.act({ serial: 'abc', action: 'link', value: 'file:///private' }, 'phone'), /desktop/);
});
