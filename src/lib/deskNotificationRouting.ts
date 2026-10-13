import type { NoteView } from '@/lib/deskNotify';

export type NotificationKind = 'approval' | 'question' | 'finished' | 'checksFailed';
export type NoticePayload = { note: NoteView; kind: NotificationKind; active: boolean;
  route: string; requestId?: string; entryId?: string; deskId?: string; runId?: string };
export type NoticeDevice = { id: string; kind: 'desk' | 'phone'; seenAt: number; idleSeconds: number; locked: boolean; enabled: boolean };
export type PingPreferences = { approvals: boolean; questions: boolean; finished: boolean; checksFailed: boolean;
  quietStart: number; quietEnd: number; utcOffset: number };
export const DEFAULT_PINGS: PingPreferences = { approvals: true, questions: true, finished: true, checksFailed: true, quietStart: 23 * 60, quietEnd: 7 * 60, utcOffset: 0 };
export function pingTime(minutes: number): string { return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
export function parsePingTime(text: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text); return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
export function pingAllowed(kind: NotificationKind, prefs: PingPreferences): boolean {
  return kind === 'approval' ? prefs.approvals : kind === 'question' ? prefs.questions : prefs[kind];
}
export function quietNow(now: number, prefs: PingPreferences): boolean {
  const minute = ((Math.floor(now / 60_000) + prefs.utcOffset) % 1440 + 1440) % 1440;
  return prefs.quietStart === prefs.quietEnd ? false : prefs.quietStart < prefs.quietEnd
    ? minute >= prefs.quietStart && minute < prefs.quietEnd : minute >= prefs.quietStart || minute < prefs.quietEnd;
}
/** One desired recipient. Transfer is fenced separately by persisted dismissal acknowledgments. */
export function notificationTarget(payload: NoticePayload, waitingSince: number, devices: readonly NoticeDevice[], prefs: PingPreferences, now: number): string | null {
  if (!payload.active || !pingAllowed(payload.kind, prefs)) return null;
  const urgent = payload.kind === 'approval' || payload.kind === 'question';
  const quiet = quietNow(now, prefs);
  if (quiet && !urgent) return null;
  const desk = devices.filter((d) => d.kind === 'desk' && d.enabled && !d.locked && d.idleSeconds < 300 && now - d.seenAt < 60_000)
    .sort((a, b) => b.seenAt - a.seenAt)[0];
  if (desk && !quiet && !(urgent && now - waitingSince >= 120_000)) return desk.id;
  return devices.filter((d) => d.kind === 'phone' && d.enabled).sort((a, b) => b.seenAt - a.seenAt)[0]?.id ?? null;
}
export function noticeCategory(payload: NoticePayload): string {
  return payload.kind === 'approval' ? payload.note.actions.some((a) => a.id === 'always') ? 'cellar-approval-full' : 'cellar-approval'
    : payload.kind === 'question' ? payload.note.actions.some((a) => a.id === 'option:1') ? payload.note.actions.some((a) => a.id === 'more') ? 'cellar-question-two-more' : 'cellar-question-two' : payload.note.actions.some((a) => a.id === 'option:0') ? 'cellar-question-one' : 'cellar-open' : 'cellar-open';
}
