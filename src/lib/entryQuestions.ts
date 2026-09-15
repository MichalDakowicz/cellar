import { oneLine } from '@/lib/dump';
import type { Entry, EntryQuestion, QuestionStatus } from '@/types/cellar';

/**
 * What a question is, and when it stops holding an entry up.
 *
 * Pure, and shared with the MCP server the same way `agentWork` is: the app
 * flips an entry back to `open` when you answer the last question, and the
 * server flips it back when it writes a chat answer in. Two copies of "is this
 * settled" is two halves that disagree about whether anyone is still waiting.
 *
 * A question is settled when it is answered *or* dismissed. Dismissed is not a
 * lesser answer — it is "do not wait on me for this", and it has to release the
 * entry or a question you decided was noise would block the thought forever.
 */

/** a, b, c, d and on. The tap target's label, and how a question reads aloud. */
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

export function optionLabel(index: number): string {
  return LETTERS[index] ?? String(index + 1);
}

/**
 * More than this and the list stops being a choice and becomes a form. Eight is
 * past anything an agent should be offering; the cap exists so a model that
 * hands over thirty cannot make an entry unreadable.
 */
export const MAX_OPTIONS = 8;

/** One line each, no blanks, no duplicates, capped. The same shape a dumped line has. */
export function normalizeOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const option = oneLine(value);
    if (!option || seen.has(option.toLowerCase())) continue;
    seen.add(option.toLowerCase());
    out.push(option);
    if (out.length === MAX_OPTIONS) break;
  }
  return out;
}

/**
 * Dismissed wins over answered.
 *
 * Both stamps being set means you answered it and then waved it off, and the
 * later decision is the one that counts — the row keeps the answer either way,
 * so nothing is lost by reading it as dismissed.
 */
export function questionStatus(question: Pick<EntryQuestion, 'answeredAt' | 'dismissedAt'>): QuestionStatus {
  if (question.dismissedAt) return 'dismissed';
  if (question.answeredAt) return 'answered';
  return 'unanswered';
}

export function isSettled(question: Pick<EntryQuestion, 'answeredAt' | 'dismissedAt'>): boolean {
  return questionStatus(question) !== 'unanswered';
}

/** Still owed an answer. What holds the entry blocked and what raises a banner. */
export function pendingQuestions<T extends Pick<EntryQuestion, 'answeredAt' | 'dismissedAt'>>(questions: T[]): T[] {
  return questions.filter((question) => !isSettled(question));
}

/** Answered, in the order they were asked. The history half of the section. */
export function settledQuestions<T extends Pick<EntryQuestion, 'answeredAt' | 'dismissedAt'>>(questions: T[]): T[] {
  return questions.filter(isSettled);
}

/**
 * Whether settling one more question unblocks the entry.
 *
 * Takes the id being settled rather than being called after the write, so the
 * app can flip the state in the same pass as the answer instead of waiting for
 * a refetch to tell it what it already knows.
 */
export function unblocksEntry(
  questions: Pick<EntryQuestion, 'id' | 'answeredAt' | 'dismissedAt'>[],
  settlingId: string,
): boolean {
  return pendingQuestions(questions).every((question) => question.id === settlingId);
}

/**
 * What the banner and the entry row say when several are outstanding.
 *
 * One question is the question itself; more than one is a count, because two
 * truncated questions in a notification body read as one incoherent sentence.
 */
export function pendingSummary(questions: Pick<EntryQuestion, 'question' | 'answeredAt' | 'dismissedAt'>[]): string | null {
  const pending = pendingQuestions(questions);
  if (pending.length === 0) return null;
  if (pending.length === 1) return pending[0].question;
  return `${pending.length} questions waiting on you`;
}

/**
 * Thoughts whose question has been answered and that nobody has picked back up.
 *
 * The other end of the multi-task loop: an agent asks, moves on, and by the
 * time its list is empty an answer may be sitting there. Answering releases the
 * entry to `open`, so "open and carrying an answered question" is exactly the
 * set worth looking at again — and it empties itself, because claiming and
 * finishing the thought takes it out of `open`.
 */
export function readyToResume<T extends Pick<Entry, 'state' | 'archived' | 'questions'>>(entries: T[]): T[] {
  return entries.filter(
    (entry) =>
      entry.state === 'open' &&
      !entry.archived &&
      entry.questions.some((question) => questionStatus(question) === 'answered'),
  );
}

/**
 * The questions *you* asked that have since been settled, on thoughts nobody
 * has picked back up.
 *
 * `readyToResume` is the session-start view — anything answered, whoever asked.
 * This is the one an agent checks mid-session: it is scoped to its own name, so
 * what comes back is a decision it is actually waiting on rather than a list of
 * everything the user has ever answered. The agent name is the same one that
 * went onto the question when it was asked, which is why the column is there.
 *
 * Dismissed counts. "do not wait on me for this" is an answer — it releases the
 * entry and it changes what gets built, and an agent that only watched for
 * `answered` would sit on a waved-off question forever.
 */
export function answeredForAgent<T extends Pick<Entry, 'state' | 'archived' | 'questions'>>(
  entries: T[],
  agent: string,
): { entry: T; questions: EntryQuestion[] }[] {
  const who = agent.trim().toLowerCase();
  if (!who) return [];

  const out: { entry: T; questions: EntryQuestion[] }[] = [];
  for (const entry of entries) {
    if (entry.state !== 'open' || entry.archived) continue;
    const mine = entry.questions.filter(
      (question) => question.agent?.trim().toLowerCase() === who && isSettled(question),
    );
    if (mine.length > 0) out.push({ entry, questions: mine });
  }
  return out;
}
