import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Tickets, VIEW_COOKIE, viewCookie, withoutViewCookie } from './tickets.ts';

test('a ticket redeems once and not after a minute', () => {
  let now = 0;
  const tickets = new Tickets(() => now);
  const once = tickets.issue({ kind: 'screen' });
  assert.deepEqual(tickets.redeem(once), { kind: 'screen' });
  assert.equal(tickets.redeem(once), null);

  const late = tickets.issue({ kind: 'view', port: 8081 });
  now = 61_000;
  assert.equal(tickets.redeem(late), null);
});

test('a session holds for hours from the address that opened it, then lapses', () => {
  let now = 0;
  const tickets = new Tickets(() => now);
  const session = tickets.openSession('192.168.1.7');
  assert.ok(tickets.validSession(session, '192.168.1.7'));
  assert.equal(tickets.validSession(session, '192.168.1.66'), false);
  now = 5 * 60 * 60_000;
  assert.equal(tickets.validSession(session, '192.168.1.7'), false);
  assert.equal(tickets.validSession(null, '192.168.1.7'), false);
});

test('reads our cookie and strips it before proxying', () => {
  const header = `theme=dark; ${VIEW_COOKIE}=abc=; sid=1`;
  assert.equal(viewCookie(header), 'abc=');
  assert.equal(withoutViewCookie(header), 'theme=dark; sid=1');
  assert.equal(withoutViewCookie(`${VIEW_COOKIE}=x`), undefined);
});
