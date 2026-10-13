import { notificationTarget, DEFAULT_PINGS, quietNow, type NoticePayload, type NoticeDevice } from './deskNotificationRouting';
const now = Date.UTC(2026, 9, 13, 12);
const devices: NoticeDevice[] = [{ id: 'desk', kind: 'desk', seenAt: now, idleSeconds: 0, locked: false, enabled: true }, { id: 'phone', kind: 'phone', seenAt: now - 1000, idleSeconds: 0, locked: false, enabled: true }];
const payload = { kind: 'approval', active: true } as NoticePayload;
test('one target: active desk, then phone at exact idle/unanswered/lock boundaries', () => {
  expect(notificationTarget(payload, now - 119999, devices, DEFAULT_PINGS, now)).toBe('desk');
  expect(notificationTarget(payload, now - 120000, devices, DEFAULT_PINGS, now)).toBe('phone');
  expect(notificationTarget(payload, now, [{ ...devices[0], idleSeconds: 300 }, devices[1]], DEFAULT_PINGS, now)).toBe('phone');
  expect(notificationTarget(payload, now, [{ ...devices[0], locked: true }, devices[1]], DEFAULT_PINGS, now)).toBe('phone');
  expect(notificationTarget(payload, now, [{ ...devices[0], seenAt: now - 60000 }, devices[1]], DEFAULT_PINGS, now)).toBe('phone');
});
test('quiet hours honor midnight, UTC offset, urgent kinds and opt-out', () => {
  const midnight = Date.UTC(2026, 9, 13, 23);
  expect(quietNow(midnight, DEFAULT_PINGS)).toBe(true);
  expect(notificationTarget(payload, midnight, devices, DEFAULT_PINGS, midnight)).toBe('phone');
  expect(notificationTarget({ ...payload, kind: 'finished' }, midnight, devices, DEFAULT_PINGS, midnight)).toBeNull();
  expect(notificationTarget(payload, now, devices, { ...DEFAULT_PINGS, approvals: false }, now)).toBeNull();
  expect(notificationTarget({ ...payload, active: false }, now, devices, DEFAULT_PINGS, now)).toBeNull();
  expect(quietNow(Date.UTC(2026, 9, 13, 21), { ...DEFAULT_PINGS, utcOffset: 120 })).toBe(true);
});
