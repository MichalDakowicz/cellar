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

export type EntryState = 'open' | 'doing' | 'done' | 'dropped';

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
};

/** One appended thought. Ordered oldest first, the way it was dumped. */
export type EntryLine = {
  id: string;
  text: string;
  createdAt: string;
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
