import type { EntryListItem } from '@/components/cellar/EntryList';

/**
 * Folding a heading away, and everything under it.
 *
 * The list is flat — sections and rows in one array, because a list inside a
 * list never re-measures (components/cellar/EntryList) — so "under it" is not a
 * tree walk, it is everything between this heading and the next one at the same
 * level or higher.
 *
 * Two levels, and they are told apart by the thing that already distinguishes
 * them on screen: a band heading carries `band` and a kind heading does not.
 * The stream reading has only day headings, which are therefore all one level,
 * and the same rule folds them correctly without knowing what a day is.
 *
 * Pure, and the reason this is not a `useMemo` in the screen: the off-by-one at
 * the boundary between two collapsed bands is the whole difficulty, and it is
 * worth being able to assert on rather than to look at.
 */

const BAND = 0;
const INNER = 1;

function levelOf(item: Extract<EntryListItem, { type: 'section' }>): number {
  return item.section.band ? BAND : INNER;
}

export function collapseItems(items: EntryListItem[], collapsed: ReadonlySet<string>): EntryListItem[] {
  if (collapsed.size === 0) return items;

  const out: EntryListItem[] = [];
  // The level whose scope we are inside and dropping. `null` is "keeping
  // everything". A heading at this level or above ends the scope — and may then
  // open one of its own, which is what makes two collapsed bands in a row work.
  let dropping: number | null = null;

  for (const item of items) {
    if (item.type !== 'section') {
      if (dropping === null) out.push(item);
      continue;
    }

    const level = levelOf(item);
    if (dropping !== null && level > dropping) continue;

    dropping = collapsed.has(item.section.key) ? level : null;
    out.push(item);
  }

  return out;
}

/** The set with one key flipped. A new set, because the store holds it as state. */
export function toggleCollapsed(collapsed: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(collapsed);
  if (!next.delete(key)) next.add(key);
  return next;
}
