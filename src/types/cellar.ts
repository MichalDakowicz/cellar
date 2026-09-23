/**
 * The three levels, and the thing at the bottom of them.
 *
 *   shelf → project → entry
 *
 * A shelf is the layer above projects — "apps" on one, "minecraft mods" on
 * another — and it is the whole reason this app exists rather than a second
 * note in a notes app: two kinds of work that must not read as one list.
 *
 * An entry is one line. It is never edited into a paragraph; it grows by taking
 * appended lines, which is a different thing and is why `lines` is its own
 * array rather than a body field.
 */

export type Kind = 'idea' | 'removal' | 'glitch' | 'question' | 'research' | 'copy' | 'design';

/** How much a thought matters inside its kind. A mark, never a sort (`lib/importance.ts`). */
export type Importance = 'low' | 'normal' | 'high';

/**
 * `blocked` is the agent's only way to reach you: it asked something it cannot
 * answer from the repo and moved on to its other work. It lifts on its own when
 * the last of the entry's questions is answered or dismissed. Everything else
 * is yours to set.
 */
export type EntryState = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';

/** Who appended a line. The stored value is the word, like `kind` and `state`. */
export type LineSource = 'user' | 'agent';

/**
 * Where an answer came from.
 *
 * `chat` means the agent ran out of other work, the question was still
 * unanswered, so it asked in the conversation instead and wrote the answer back
 * here. Worth keeping apart from `app`: it is the difference between a decision
 * you made in your own time and one you made because something was waiting.
 */
export type AnsweredVia = 'app' | 'chat';

/** Unanswered, answered, or waved off. Derived, never stored — see `lib/entryQuestions`. */
export type QuestionStatus = 'unanswered' | 'answered' | 'dismissed';

export type Shelf = {
  id: string;
  name: string;
  position: number;
  createdAt: string;
};

export type Project = {
  id: string;
  shelfId: string;
  name: string;
  position: number;
  createdAt: string;
  /**
   * The local checkout. This is the one that does work — an agent resolves
   * which project it is standing in by matching its working directory against
   * it, so no one has to be asked.
   */
  repoPath: string | null;
  /** The remote, for opening. Never matched against — a URL is not a directory. */
  repoUrl: string | null;
  /**
   * Sorts first inside its own shelf, and first in every list of projects that
   * spans shelves. That is all it does — there is no pinned band, so a pinned
   * project is never on one screen twice (`lib/projectOrder.ts`).
   */
  pinned: boolean;
};

/** One appended thought. Ordered oldest first, the way it was dumped. */
export type EntryLine = {
  id: string;
  text: string;
  createdAt: string;
  source: LineSource;
};

/**
 * One thing an agent stopped to ask, and what came back.
 *
 * Not a line. A line is the thought growing; this is a fork in it — it carries
 * the options that were offered and the answer that settled it, and it stays
 * after being answered because the pair is the only record of why the thought
 * was built the way it was.
 */
export type EntryQuestion = {
  id: string;
  question: string;
  /** The choices offered, in order. Empty means free text only. */
  options: string[];
  answer: string | null;
  answeredAt: string | null;
  answeredVia: AnsweredVia | null;
  /** Waved off rather than answered. Stops holding the entry blocked either way. */
  dismissedAt: string | null;
  /** Who asked. */
  agent: string | null;
  createdAt: string;
};

export type Entry = {
  id: string;
  /** `null` is the inbox — dumped without picking a project, on purpose. */
  projectId: string | null;
  text: string;
  kind: Kind;
  state: EntryState;
  importance: Importance;
  /**
   * Out of the project and out of the inbox, still in search, one tap from
   * coming back. Nothing in this app is deleted to get it out of the way.
   */
  archived: boolean;
  createdAt: string;
  /** Who is on it, when an agent claimed it. Null the rest of the time. */
  agent: string | null;
  lines: EntryLine[];
  /** Oldest first. `blocked` means at least one of these is still unanswered. */
  questions: EntryQuestion[];
};

/** What the capture screen holds before it becomes entries. */
export type Draft = {
  text: string;
  kind: Kind;
  projectId: string | null;
  /** Many lines → many entries. Folded away behind one line until asked for. */
  raw: boolean;
};

/**
 * A token a hosted agent presents instead of signing in.
 *
 * The token itself is not in here and never comes back from a read — the
 * database keeps only its hash, and the plaintext exists exactly once, in the
 * reply to minting it. `revokedAt` is a timestamp rather than a missing row
 * because "which machine was that, and when did I turn it off" is a question
 * you will ask.
 */
export type AgentToken = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};
