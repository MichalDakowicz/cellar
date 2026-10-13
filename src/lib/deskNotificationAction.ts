import type { NoticePayload } from './deskNotificationRouting';
export function notificationAction(payload: NoticePayload, action: string): { kind: 'approval'; decision: 'allow' | 'always' | 'deny' } | { kind: 'question'; index: number } | { kind: 'open' } {
  if (!payload.note.actions.some((a) => a.id === action)) return { kind: 'open' };
  if (payload.kind === 'approval' && ['allow', 'always', 'deny'].includes(action)) return { kind: 'approval', decision: action as 'allow' | 'always' | 'deny' };
  const index = /^option:([01])$/.exec(action);
  return payload.kind === 'question' && index ? { kind: 'question', index: Number(index[1]) } : { kind: 'open' };
}
export function noticeRoute(payload: NoticePayload): string | null {
  return /^\/(?:entry\/[a-f0-9-]{36}|desk\/run\/[a-z0-9-]{6,100})$/i.test(payload.route) ? payload.route : null;
}
