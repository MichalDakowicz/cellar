import { KINDS, type KindMeta } from '@/lib/kinds';
import type { Entry, Kind } from '@/types/cellar';

/**
 * The seven preferences that shape how the cellar reads, and what each one
 * actually does. Stored on `cellar_settings` like the rest (`cellarSettings.ts`),
 * so the phone and the browser agree; decided here, so no screen has to.
 *
 * Every value is a word, like `kind` and `state`, and every reader falls back
 * to the default for a word it does not know — a newer build that adds a fourth
 * text size must not blank the row on an older one.
 */

export type RowDensity = 'roomy' | 'compact';
export type TextSize = 'small' | 'normal' | 'large';
export type ProjectSort = 'newest' | 'oldest';
export type StartTab = 'dump' | 'shelf' | 'inbox' | 'stats';

const DENSITIES: RowDensity[] = ['roomy', 'compact'];
const TEXT_SIZES: TextSize[] = ['small', 'normal', 'large'];
const PROJECT_SORTS: ProjectSort[] = ['newest', 'oldest'];
const START_TABS: StartTab[] = ['dump', 'shelf', 'inbox', 'stats'];

function oneOf<T extends string>(allowed: readonly T[], fallback: T) {
  return (value: unknown): T => (allowed.includes(value as T) ? (value as T) : fallback);
}

export const rowDensityOf = oneOf(DENSITIES, 'roomy');
export const textSizeOf = oneOf(TEXT_SIZES, 'normal');
export const projectSortOf = oneOf(PROJECT_SORTS, 'newest');
export const startTabOf = oneOf(START_TABS, 'dump');

/** Where each tab lives. `dump` is the index route — the thing the app is opened for. */
export const START_TAB_ROUTES: Record<StartTab, string> = {
  dump: '/',
  shelf: '/shelf',
  inbox: '/inbox',
  stats: '/stats',
};

/**
 * What a row's two dials turn into. Vertical padding and the thought's size
 * and line height, together: a compact row with large text is a legitimate
 * choice (fewer rows, easier to read), and a line height that did not follow
 * the size would clip it.
 */
export function rowMetrics(density: RowDensity, size: TextSize): { padY: number; fontSize: number; lineHeight: number } {
  const type = size === 'small' ? { fontSize: 13, lineHeight: 18 } : size === 'large' ? { fontSize: 16, lineHeight: 22 } : { fontSize: 14, lineHeight: 20 };
  return { padY: density === 'compact' ? 5 : 10, ...type };
}

/**
 * The seven kinds in your order. Anything the stored order leaves out — a kind
 * added after you chose, a stale word — keeps its place from the default, after
 * the ones you placed. So a partial order is a valid order, and so is none.
 */
export function orderedKinds(order: readonly string[] | null | undefined): KindMeta[] {
  if (!order || order.length === 0) return KINDS;
  const placed: KindMeta[] = [];
  for (const value of order) {
    const meta = KINDS.find((kind) => kind.value === value);
    if (meta && !placed.includes(meta)) placed.push(meta);
  }
  return [...placed, ...KINDS.filter((kind) => !placed.includes(kind))];
}

/** A tap in the kind-order picker: that kind to the front, the rest as they were. */
export function kindToFront(order: readonly string[] | null | undefined, kind: Kind): Kind[] {
  const current = orderedKinds(order).map((meta) => meta.value);
  return [kind, ...current.filter((value) => value !== kind)];
}

/** Stored as given, but only words this build knows, once each. `null` is "the default order". */
export function kindOrderOf(value: unknown): Kind[] | null {
  if (!Array.isArray(value)) return null;
  const known = orderedKinds(value as string[]).map((meta) => meta.value);
  const given = (value as unknown[]).filter((item): item is Kind => known.includes(item as Kind));
  return given.length > 0 ? [...new Set(given)] : null;
}

/** A project's rows in the chosen order. Ties on the stamp keep the order they came in. */
export function sortForProject<T extends Pick<Entry, 'createdAt'>>(entries: T[], sort: ProjectSort): T[] {
  const sign = sort === 'oldest' ? 1 : -1;
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => sign * a.entry.createdAt.localeCompare(b.entry.createdAt) || a.index - b.index)
    .map(({ entry }) => entry);
}

/**
 * The headings folded before you touch anything. With "hide done and dropped"
 * on, the two settled bands start folded, and so does the settled tail of the
 * stream — they are still there with their counts, one tap from open.
 */
export const SETTLED_KEYS = ['b:done', 'b:dropped', 's:settled'] as const;

export function foldedByDefault(hideSettled: boolean): ReadonlySet<string> {
  return new Set(hideSettled ? SETTLED_KEYS : []);
}

/**
 * What is actually folded: the defaults, with every heading you tapped flipped.
 * A tap on a band that started folded opens it, which is why this is a
 * symmetric difference and not a union.
 */
export function effectiveCollapsed(toggled: ReadonlySet<string>, defaults: ReadonlySet<string>): Set<string> {
  const out = new Set(defaults);
  for (const key of toggled) if (!out.delete(key)) out.add(key);
  return out;
}
