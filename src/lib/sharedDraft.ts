import { plan } from './dump';
import { guessKind } from './deskLater';
import type { Kind } from '@/types/cellar';

export type SharedSubmission = { id: string; text: string; title: string; lines: string[]; kind: Kind; projectId: string | null; handoff: boolean; submittedAt: number };
export type SharedDraft = { id: string; text: string; picked: Kind | null; projectId: string | null; handoff: boolean; submission?: SharedSubmission };
export function sharedDraft(id: string, text: string): SharedDraft { return { id, text: text.slice(0, 8000), picked: null, projectId: null, handoff: false }; }
export function editSharedDraft(draft: SharedDraft, patch: Partial<Pick<SharedDraft, 'text' | 'picked' | 'projectId' | 'handoff'>>) {
  return draft.submission ? draft : { ...draft, ...patch, text: (patch.text ?? draft.text).slice(0, 8000) };
}
export function submitSharedDraft(draft: SharedDraft, now = Date.now()): SharedDraft {
  if (draft.submission) return draft;
  const kind = draft.picked ?? guessKind(draft.text);
  const drop = plan({ text: draft.text, kind, projectId: draft.projectId, raw: false }, null).drops[0];
  if (!drop) throw new Error('Write something to file.');
  return { ...draft, submission: { id: draft.id, text: draft.text, title: drop.text, lines: drop.lines, kind, projectId: draft.projectId, handoff: draft.handoff, submittedAt: now } };
}
export function migrateSharedDrafts(raw: unknown, version: number, uuid: () => string) {
  if (version !== 1) return { pending: {} as Record<string, SharedDraft[]> };
  const old = (raw as { pending?: Record<string, unknown[]> })?.pending ?? {};
  return { pending: Object.fromEntries(Object.entries(old).map(([owner, rows]) => [owner, Array.isArray(rows) ? rows.filter((r): r is string => typeof r === 'string').slice(0, 10).map((text) => sharedDraft(uuid(), text)) : []])) };
}
