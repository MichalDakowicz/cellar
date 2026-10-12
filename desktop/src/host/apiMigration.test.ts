import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, type HostDeps } from './api';

test('desktop tickets use loopback while phone tickets retain reachable LAN host', async () => {
  const issued: unknown[] = [];
  const deps = {
    identity: () => ({ port: 47821 }), lanHost: () => '192.168.1.20',
    tickets: { issue: (ticket: unknown) => { issued.push(ticket); return 'one-use-token'; } },
  } as unknown as HostDeps;
  const desktop = await handle(deps, { method: 'POST', path: '/tickets', source: 'pc', body: { kind: 'screen' } });
  assert.deepEqual(desktop, { status: 200, body: { url: 'http://127.0.0.1:47821/t/one-use-token' } });
  const phone = await handle(deps, { method: 'POST', path: '/tickets', source: 'phone', body: { kind: 'screen', source: 'pc' } });
  assert.deepEqual(phone, { status: 200, body: { url: 'http://192.168.1.20:47821/t/one-use-token' } });
  assert.deepEqual(issued, [{ kind: 'screen' }, { kind: 'screen' }]);
  deps.lanHost = () => null;
  assert.equal((await handle(deps, { method: 'POST', path: '/tickets', body: { kind: 'screen' } })).status, 409);
  assert.equal((await handle(deps, { method: 'POST', path: '/tickets', source: 'pc', body: { kind: 'screen' } })).status, 200);
});
