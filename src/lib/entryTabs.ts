import { ENTRY_STATES } from '@/lib/entryState';
import type { Entry, EntryState } from '@/types/cellar';

/**
 * The cut a project's list is read through: one state, or the archive.
 *
 * A project page used to show every state at once, which meant a year of done
 * and dropped thoughts sat between you and the two you were actually going to
 * work on. One tab at a time fixes that without hiding anything — the counts
 * ride on the tabs, so what is behind the one you are not looking at is never
 * a surprise.
 *
 * `archived` is a tab and not a state: it is a column on the row, an entry is
 * archived *and* done. Making it the sixth tab is what lets the archive stop
 * being a toggle you have to remember to turn back off.
 */
export type EntryTab = EntryState | 'archived';

/**
 * Blocked first — it is the one state the user never set, and it means the
 * thought is waiting on them. Archived last, because it is the only tab that is
 * not work. The four in between are the life of a thought, in order.
 */
export const ENTRY_TABS: EntryTab[] = ['blocked', 'open', 'doing', 'done', 'dropped', 'archived'];

/** Where a project opens. Never `archived` — the archive is somewhere you go. */
export const DEFAULT_TAB: EntryTab = 'open';

export function isEntryTab(value: unknown): value is EntryTab {
  return typeof value === 'string' && ENTRY_TABS.includes(value as EntryTab);
}

/**
 * An archived entry answers only to the archive tab, whatever state it is in.
 * Otherwise the last five thoughts you put away would still be sitting in
 * `done`, which is the thing archiving them was meant to stop.
 */
export function matchesTab(entry: Entry, tab: EntryTab): boolean {
  if (tab === 'archived') return entry.archived;
  return !entry.archived && entry.state === tab;
}

export function filterByTab(entries: Entry[], tab: EntryTab): Entry[] {
  return entries.filter((entry) => matchesTab(entry, tab));
}

export type TabCount = { tab: EntryTab; label: string; count: number };

/**
 * Every tab with what is behind it, in ENTRY_TABS order. Includes the empty
 * ones: which tabs a project has nothing in is the same information as which
 * ones it does, and a row that reorders itself as you work is unreadable.
 */
export function tabCounts(entries: Entry[]): TabCount[] {
  return ENTRY_TABS.map((tab) => ({
    tab,
    label: tabLabel(tab),
    count: entries.filter((entry) => matchesTab(entry, tab)).length,
  }));
}

const BY_STATE = new Map(ENTRY_STATES.map((meta) => [meta.value as EntryTab, meta.label as string]));

/** The state's own word, so a tab and the badge on its rows never disagree. */
export function tabLabel(tab: EntryTab): string {
  return BY_STATE.get(tab) ?? 'archived';
}
