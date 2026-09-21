/**
 * Which draft an edit sheet should be holding, and when that has to be written
 * back rather than merely derived.
 *
 * The sheets are mounted once for the life of the app (`CellarSheets`), so the
 * state behind them never unmounts. A draft therefore has to be keyed to the
 * row it was seeded from *and* to the fact that the sheet was open when it was
 * written — otherwise a rename the user abandoned sits in state under that
 * row's key and comes straight back the next time that row is opened.
 *
 * Deriving alone cannot notice the close: nothing writes state while the sheet
 * is shut, so the held key stays on the old row forever. `persist` is the one
 * write that fixes it, and it only ever happens on the closed render — the open
 * path keeps its single-render derivation, because setting state from an effect
 * as a sheet opens paints the old name for a frame first.
 *
 * Pure, no React: this is the part worth testing, and it is only testable if it
 * never touches a renderer.
 */

export type HeldDraft<T> = {
  key: string;
  values: T;
  confirming: boolean;
};

/** No row id can spell this, so "closed" never collides with a target. */
export const CLOSED_DRAFT = '\u0000closed';

export function draftKey(open: boolean, targetId: string | null): string {
  return open ? (targetId ?? '') : CLOSED_DRAFT;
}

export function seedDraft<T>(key: string, initial: T): HeldDraft<T> {
  return { key, values: initial, confirming: false };
}

export type DraftResolution<T> = {
  /** What the sheet renders this pass. */
  draft: HeldDraft<T>;
  /** Whether `draft` has to replace what is held, or is only derived. */
  persist: boolean;
};

export function resolveDraft<T>(
  held: HeldDraft<T>,
  open: boolean,
  targetId: string | null,
  initial: T,
): DraftResolution<T> {
  const key = draftKey(open, targetId);
  if (held.key === key) return { draft: held, persist: false };
  return { draft: seedDraft(key, initial), persist: !open };
}
