import type { Draft, Kind } from '@/types/cellar';

/**
 * The capture rule: what a draft becomes when you drop it.
 *
 * Normal mode is one entry, always — the newlines a soft keyboard sneaks in get
 * collapsed rather than silently splitting a thought in two. Raw mode is the
 * opposite promise: one line in, one entry out, blank lines ignored. The whole
 * value of the raw toggle is that the two modes never guess.
 */

export type DumpPlan = {
  /** The text of each entry to create, in the order they were typed. */
  texts: string[];
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
  const texts = draft.raw ? splitLines(draft.text) : oneLine(draft.text) ? [oneLine(draft.text)] : [];
  const where = projectName ?? 'inbox';

  if (texts.length === 0) return { texts, label: `drop into ${where}`, empty: true };
  if (texts.length === 1) return { texts, label: `drop into ${where}`, empty: false };
  return { texts, label: `drop ${texts.length} entries into ${where}`, empty: false };
}

/**
 * The line under the field. In raw mode it is a running count of what return
 * will actually create, because "many lines at once" is a promise the user has
 * to be able to check before they commit to it.
 */
export function dumpHint(draft: Draft): string {
  if (!draft.raw) return 'many lines at once';
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
 */
export function shouldSubmitOnReturn(raw: boolean, modifiers: { shift: boolean; meta: boolean }): boolean {
  return raw ? modifiers.meta : !modifiers.shift;
}

export function returnHint(raw: boolean): string {
  return raw ? 'ctrl + return to drop' : 'return to drop · shift + return for a new line';
}

export const EMPTY_DRAFT = (kind: Kind, projectId: string | null, raw: boolean): Draft => ({
  text: '',
  kind,
  projectId,
  raw,
});
