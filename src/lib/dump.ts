import type { Draft, Kind } from '@/types/cellar';

/**
 * The capture rule: what a draft becomes when you drop it.
 *
 * Normal mode is one entry, always. Its first line is the thought and every
 * line under it becomes a note on that entry — the shape you already get by
 * coming back and dumping more into something, reached from the field instead.
 * Newlines used to be collapsed here; that turned a title and two notes into
 * one long run-on, which is the thing this app exists to stop.
 *
 * Raw mode is the opposite promise and is unchanged: one line in, one entry
 * out, blank lines ignored, nothing nested. The value of the toggle is that the
 * two modes never guess.
 */

/** One entry to create, and the notes that came in under it. */
export type Drop = {
  text: string;
  /** Appended to the entry in this order. Empty in raw mode, always. */
  lines: string[];
};

export type DumpPlan = {
  /** Each entry to create, in the order they were typed. */
  drops: Drop[];
  /** What the drop button says. Names the count and the destination, never "submit". */
  label: string;
  /** Nothing to drop — an empty draft, or a raw dump of nothing but blank lines. */
  empty: boolean;
};

/** Collapses every run of whitespace, including newlines, to a single space. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Non-blank lines, trimmed. The raw dump's only rule. */
export function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function plan(draft: Draft, projectName: string | null): DumpPlan {
  const drops = draft.raw ? splitLines(draft.text).map(bare) : titleAndNotes(draft.text);
  const where = projectName ?? 'inbox';

  if (drops.length === 0) return { drops, label: `drop into ${where}`, empty: true };
  if (drops.length === 1) return { drops, label: `drop into ${where}`, empty: false };
  return { drops, label: `drop ${drops.length} entries into ${where}`, empty: false };
}

const bare = (text: string): Drop => ({ text, lines: [] });

/**
 * The first line is the thought; the rest are notes under it.
 *
 * `oneLine` still runs on each of them, so a soft keyboard's stray wrapping
 * inside one line collapses the way it always did — what changed is that a
 * deliberate return is now a note boundary rather than a space.
 */
function titleAndNotes(text: string): Drop[] {
  const [title, ...notes] = splitLines(text).map(oneLine).filter(Boolean);
  return title ? [{ text: title, lines: notes }] : [];
}

/**
 * The line under the field. In raw mode it is a running count of what return
 * will actually create, because "many lines at once" is a promise the user has
 * to be able to check before they commit to it.
 */
export function dumpHint(draft: Draft): string {
  if (!draft.raw) {
    const notes = titleAndNotes(draft.text)[0]?.lines.length ?? 0;
    if (notes === 0) return 'a new line becomes a note under it';
    return notes === 1 ? '1 thought · 1 note' : `1 thought · ${notes} notes`;
  }
  const count = splitLines(draft.text).length;
  if (count === 0) return 'one thought per line';
  return count === 1 ? '1 line → 1 entry' : `${count} lines → ${count} entries`;
}

export function dumpPlaceholder(raw: boolean): string {
  return raw ? 'one thought per line —\nblank lines ignored' : 'what just hit you?';
}

/**
 * Return drops; the modifier makes a newline. Raw mode inverts it, because in
 * raw mode a newline is the *content* and dropping is the rare act.
 *
 * Only ever asked on a keyboard that has the modifiers. A soft keyboard has
 * neither shift nor ctrl to offer, so the caller does not consult this at all
 * there — return is a newline and the drop button is the drop.
 */
export function shouldSubmitOnReturn(raw: boolean, modifiers: { shift: boolean; meta: boolean }): boolean {
  return raw ? modifiers.meta : !modifiers.shift;
}

/**
 * The line under the drop button, and it has to be true on the device reading
 * it. `modifiers` is a real keyboard — a phone has no shift + return to offer,
 * and telling it to press one is how a capture screen stops being trusted.
 */
export function returnHint(raw: boolean, modifiers: boolean): string {
  if (!modifiers) return raw ? 'one thought per line · drop to catch them' : 'return for a new line · drop to catch it';
  return raw ? 'ctrl + return to drop' : 'return to drop · shift + return for a new line';
}

export const EMPTY_DRAFT = (kind: Kind, projectId: string | null, raw: boolean): Draft => ({
  text: '',
  kind,
  projectId,
  raw,
});
