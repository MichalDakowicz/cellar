import type { Importance } from '@/types/cellar';

/**
 * How much a thought matters, inside its kind.
 *
 * Three levels and no more — five would be a form to fill in on a screen whose
 * point is that catching a thought costs one line. Stored as the display word,
 * like `kind` and `state`.
 *
 * It is a mark on the row and never a sort. Entries also carry a drag position,
 * and two manual orders fighting over one list is one too many: position says
 * where you put a thought, importance says how much it matters.
 *
 * `normal` is most of the cellar and is never marked, for the same reason
 * `open` is never badged — a mark on almost every row marks nothing. Only the
 * two exceptions draw.
 */
export type ImportanceMeta = {
  value: Importance;
  label: Importance;
  /** Drawn on the row. `normal` is the unmarked default. */
  marked: boolean;
};

export const IMPORTANCES: ImportanceMeta[] = [
  { value: 'low', label: 'low', marked: true },
  { value: 'normal', label: 'normal', marked: false },
  { value: 'high', label: 'high', marked: true },
];

export const DEFAULT_IMPORTANCE: Importance = 'normal';

const BY_VALUE = new Map(IMPORTANCES.map((meta) => [meta.value, meta]));

export function isImportance(value: unknown): value is Importance {
  return typeof value === 'string' && BY_VALUE.has(value as Importance);
}

/** A word this build does not know reads as unremarkable, not as blank. */
export function importanceOf(value: unknown): Importance {
  return isImportance(value) ? value : DEFAULT_IMPORTANCE;
}

export function importanceMeta(value: unknown): ImportanceMeta {
  return BY_VALUE.get(importanceOf(value))!;
}
