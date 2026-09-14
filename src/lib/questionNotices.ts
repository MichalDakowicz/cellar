import { waitingOnYou } from '@/lib/agentWork';
import { pendingQuestions, pendingSummary } from '@/lib/entryQuestions';
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
 * The identity of a notice is the entry *and the newest question outstanding on
 * it*, not the entry alone. Asking something new on a thought that is already
 * blocked is new information and says so; answering one of several, or
 * re-blocking with nothing added, stays quiet.
 *
 * One banner per entry even when several questions are waiting — two truncated
 * questions in a notification body read as one incoherent sentence, so the body
 * becomes a count and the entry itself carries the detail.
 */

export type QuestionNotice = {
  /** The notice's own identity — the newest question outstanding. */
  key: string;
  /**
   * Every question this banner speaks for.
   *
   * All of them are remembered as shown, not just `key`: a banner that said
   * "2 questions waiting on you" has told you about both, so answering one must
   * not make the other look like something new to announce.
   */
  covers: string[];
  entryId: string;
  /** The thought, as the notification's title. */
  title: string;
  /** The question, or how many are waiting, as its body. */
  body: string;
};

type Asked = { key: string; keys: string[]; body: string };

/**
 * What this entry is asking, if anything.
 *
 * The fallback is for entries blocked before questions were rows of their own:
 * back then asking *was* appending a line and stopping, so the last thing the
 * agent said is the question. Without it, every thought blocked under the old
 * shape goes quiet forever.
 */
function asked(entry: Pick<Entry, 'id' | 'lines' | 'questions'>): Asked | null {
  const pending = pendingQuestions(entry.questions);
  if (pending.length > 0) {
    const keys = pending.map((question) => `${entry.id}:${question.id}`);
    const body = pendingSummary(entry.questions);
    return body ? { key: keys[keys.length - 1], keys, body } : null;
  }

  if (entry.questions.length > 0) return null;

  const line = [...entry.lines].reverse().find((candidate) => candidate.source === 'agent');
  return line ? { key: `${entry.id}:${line.id}`, keys: [`${entry.id}:${line.id}`], body: line.text } : null;
}

export function noticeKey(entry: Pick<Entry, 'id' | 'lines' | 'questions'>): string | null {
  return asked(entry)?.key ?? null;
}

/** Every key an entry's outstanding questions own. What `nextSeen` keeps alive. */
export function noticeKeys(entry: Pick<Entry, 'id' | 'lines' | 'questions'>): string[] {
  return asked(entry)?.keys ?? [];
}

export function pendingNotices(entries: Entry[], projects: Project[], seen: readonly string[]): QuestionNotice[] {
  const already = new Set(seen);
  const names = new Map(projects.map((project) => [project.id, project.name]));

  return waitingOnYou(entries).flatMap((entry) => {
    const question = asked(entry);
    // Blocked with nothing outstanding is not a question anyone can answer, so
    // there is nothing worth waking the phone for.
    if (!question || already.has(question.key)) return [];

    const where = entry.projectId ? names.get(entry.projectId) : null;
    return [
      {
        key: question.key,
        covers: question.keys,
        entryId: entry.id,
        title: where ? `${where} — ${entry.text}` : entry.text,
        body: question.body,
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
  const live = new Set(waitingOnYou(entries).flatMap(noticeKeys));
  const kept = [...new Set([...seen, ...shown])].filter((key) => live.has(key));
  return kept.slice(-SEEN_LIMIT);
}
