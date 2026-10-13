import { notificationAction, noticeRoute } from './deskNotificationAction';
import type { NoticePayload } from './deskNotificationRouting';
test('notification grants stay within advertised actions and choice range', () => {
  const approval = { kind: 'approval', note: { actions: [{ id: 'allow' }, { id: 'deny' }] } } as NoticePayload;
  expect(notificationAction(approval, 'always')).toEqual({ kind: 'open' });
  expect(notificationAction(approval, 'allow')).toEqual({ kind: 'approval', decision: 'allow' });
  const question = { kind: 'question', note: { actions: [{ id: 'option:0' }, { id: 'option:1' }, { id: 'more' }] } } as NoticePayload;
  expect(notificationAction(question, 'option:1')).toEqual({ kind: 'question', index: 1 });
  expect(notificationAction(question, 'option:2')).toEqual({ kind: 'open' });
  expect(notificationAction(question, 'more')).toEqual({ kind: 'open' });
});
test('notification routes remain local entry/run destinations', () => {
  expect(noticeRoute({ route: '/entry/00000000-0000-4000-8000-000000000001' } as NoticePayload)).toBeTruthy();
  expect(noticeRoute({ route: '/desk/run/abcdef01' } as NoticePayload)).toBeTruthy();
  for (const route of ['https://example.com', '//evil.test', '/settings', '/entry/../secret']) expect(noticeRoute({ route } as NoticePayload)).toBeNull();
});
