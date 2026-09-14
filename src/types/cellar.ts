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

/**
 * `blocked` is the agent's only way to reach you: it appended a question it
 * cannot answer from the repo and stopped. Everything else is yours to set.
 */
export type EntryState = 'open' | 'doing' | 'blocked' | 'done' | 'dropped';

/** Who appended a line. The stored value is the word, like `kind` and `state`. */
export type LineSource = 'user' | 'agent';

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
};

/** One appended thought. Ordered oldest first, the way it was dumped. */
export type EntryLine = {
  id: string;
  text: string;
  createdAt: string;
  source: LineSource;
};

export type Entry = {
  id: string;
  /** `null` is the inbox — dumped without picking a project, on purpose. */
  projectId: string | null;
  text: string;
  kind: Kind;
  state: EntryState;
  /**
   * Out of the project and out of the inbox, still in search, one tap from
   * coming back. Nothing in this app is deleted to get it out of the way.
   */
  archived: boolean;
  createdAt: string;
  /** Who is on it, when an agent claimed it. Null the rest of the time. */
  agent: string | null;
  lines: EntryLine[];
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
