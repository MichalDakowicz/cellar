import { waitingOnYou } from '@/lib/agentWork';
import type { Entry, Project } from '@/types/cellar';

/**
 * Which blocked questions still owe you a banner.
 *
 * Pure, and the only part of the notification path worth testing: everything
 * else is expo-notifications doing what it is told. It is also the part that
 * gets it wrong — the failure is not "no notification", it is the same question
 * arriving every time the phone wakes up, which is how an app gets its
 * notifications turned off for good.
 *
 * The identity of a notice is the entry *and the line that asked*, not the
 * entry alone. An agent that blocks the same thought a second time with a new
 * question has asked something new and should say so; re-blocking with nothing
 * added should stay quiet.
 */

export type QuestionNotice = {
  /** Stable across wakes. What gets remembered as already shown. */
  key: string;
  entryId: string;
  /** The thought, as the notification's title. */
  title: string;
  /** The question, as its body. */
  body: string;
};

export function noticeKey(entry: Pick<Entry, 'id' | 'lines'>): string | null {
  const asked = [...entry.lines].reverse().find((line) => line.source === 'agent');
  return asked ? `${entry.id}:${asked.id}` : null;
}

export function pendingNotices(entries: Entry[], projects: Project[], seen: readonly string[]): QuestionNotice[] {
  const already = new Set(seen);
  const names = new Map(projects.map((project) => [project.id, project.name]));

  return waitingOnYou(entries).flatMap((entry) => {
    const asked = [...entry.lines].reverse().find((line) => line.source === 'agent');
    const key = asked ? `${entry.id}:${asked.id}` : null;
    // Blocked with nothing appended is not a question anyone can answer, so
    // there is nothing worth waking the phone for.
    if (!key || !asked || already.has(key)) return [];

    const where = entry.projectId ? names.get(entry.projectId) : null;
    return [
      {
        key,
        entryId: entry.id,
        title: where ? `${where} — ${entry.text}` : entry.text,
        body: asked.text,
      },
    ];
  });
}

/**
 * What to remember after showing them.
 *
 * Only keys that are still blocked are kept: a question you answered and closed
 * cannot come round again, so holding its key forever would grow this list for
 * the life of the install. Bounded anyway, because an MMKV value that only ever
 * grows is a bug with a long fuse.
 */
export const SEEN_LIMIT = 200;

export function nextSeen(entries: Entry[], seen: readonly string[], shown: readonly string[]): string[] {
  const live = new Set(waitingOnYou(entries).map(noticeKey).filter((key): key is string => key !== null));
  const kept = [...new Set([...seen, ...shown])].filter((key) => live.has(key));
  return kept.slice(-SEEN_LIMIT);
}
