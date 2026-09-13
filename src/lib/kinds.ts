import type { Kind } from '@/types/cellar';

/**
 * The eight kinds of thought this app catches, and the mono code each one wears
 * in the gutter of a list.
 *
 * The codes are monochrome and they are the whole reason a wall of one-line
 * entries scans. Eight colours would be a legend you have to learn, and would
 * also spend the accent eight times over on a screen where it is supposed to
 * mark exactly one live thing (PING.md §1.2). A fixed-width column of `bug` /
 * `idea` / `dsgn` reads like a ledger instead.
 *
 * The stored value *is* the label (PING.md §2.3) — no enum, no mapping table
 * back to display text, so a kind can never be shown as something it isn't.
 */
export type KindMeta = {
  value: Kind;
  label: Kind;
  /** Four characters at most, so the gutter is one column wide at every row. */
  code: string;
};

export const KINDS: KindMeta[] = [
  { value: 'idea', label: 'idea', code: 'idea' },
  { value: 'addition', label: 'addition', code: 'add' },
  { value: 'removal', label: 'removal', code: 'rm' },
  { value: 'glitch', label: 'glitch', code: 'bug' },
  { value: 'question', label: 'question', code: 'q' },
  { value: 'research', label: 'research', code: 'res' },
  { value: 'copy', label: 'copy', code: 'copy' },
  { value: 'design', label: 'design', code: 'dsgn' },
];

export const DEFAULT_KIND: Kind = 'idea';

const BY_VALUE = new Map(KINDS.map((kind) => [kind.value, kind]));

/** The only accessor. An unknown value falls back to the default rather than throwing. */
export function kindMeta(value: string | null | undefined): KindMeta {
  return BY_VALUE.get(value as Kind) ?? BY_VALUE.get(DEFAULT_KIND)!;
}

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && BY_VALUE.has(value as Kind);
}

/** The gutter's width in characters — the longest code, so nothing shifts. */
export const KIND_CODE_WIDTH = KINDS.reduce((widest, kind) => Math.max(widest, kind.code.length), 0);
