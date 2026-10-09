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

test('a session holds for hours, then lapses', () => {
  let now = 0;
  const tickets = new Tickets(() => now);
  const session = tickets.openSession();
  assert.ok(tickets.validSession(session));
  now = 13 * 60 * 60_000;
  assert.equal(tickets.validSession(session), false);
  assert.equal(tickets.validSession(null), false);
});

test('reads our cookie and strips it before proxying', () => {
  const header = `theme=dark; ${VIEW_COOKIE}=abc=; sid=1`;
  assert.equal(viewCookie(header), 'abc=');
  assert.equal(withoutViewCookie(header), 'theme=dark; sid=1');
  assert.equal(withoutViewCookie(`${VIEW_COOKIE}=x`), undefined);
});
