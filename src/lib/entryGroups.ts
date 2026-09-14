import { ENTRY_STATES, isLive } from '@/lib/entryState';
import { KINDS } from '@/lib/kinds';
import type { Entry, EntryState, Kind } from '@/types/cellar';

/**
 * Everything that turns a flat list of entries into the two readings of a
 * project: grouped by kind, or one stream by day.
 *
 * Pure, and deliberately so — these are the shapes every screen argues about,
 * and they are only worth arguing about once if they can be tested without a
 * renderer.
 */

export type EntryFilter = {
  kinds: Kind[];
  /** `null` means any state. */
  state: EntryState | null;
  /** Archived entries are out of every list until this is on. */
  showArchived: boolean;
};

export const NO_FILTER: EntryFilter = { kinds: [], state: null, showArchived: false };

export function hasFilter(filter: EntryFilter): boolean {
  return filter.kinds.length > 0 || filter.state !== null;
}

export function matches(entry: Entry, filter: EntryFilter): boolean {
  if (entry.archived && !filter.showArchived) return false;
  if (filter.kinds.length > 0 && !filter.kinds.includes(entry.kind)) return false;
  if (filter.state !== null && entry.state !== filter.state) return false;
  return true;
}

export function applyFilter(entries: Entry[], filter: EntryFilter): Entry[] {
  return entries.filter((entry) => matches(entry, filter));
}

/** "any kind" / "glitch · question · doing". What the left island's dot is about. */
export function filterSummary(filter: EntryFilter): string {
  const kinds = filter.kinds.length > 0 ? filter.kinds.join(' · ') : 'any kind';
  return filter.state ? `${kinds} · ${filter.state}` : kinds;
}

export type KindGroup = { kind: Kind; code: string; entries: Entry[] };

/**
 * Grouped by kind, in the fixed order of KINDS — not by size. A project whose
 * sections reorder themselves as you file things is a project you have to
 * re-read every visit. Empty kinds drop out entirely.
 */
export function groupByKind(entries: Entry[]): KindGroup[] {
  return KINDS.map((meta) => ({
    kind: meta.value,
    code: meta.code,
    entries: entries.filter((entry) => entry.kind === meta.value),
  })).filter((group) => group.entries.length > 0);
}

export type DayGroup = { key: string; entries: Entry[] };

/**
 * One stream, newest first, cut into local days. The key is `YYYY-MM-DD` so the
 * label stays a presentation decision.
 */
export function groupByDay(entries: Entry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const entry of [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    const key = dayKeyOf(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(entry);
    else groups.push({ key, entries: [entry] });
  }
  return groups;
}

function dayKeyOf(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export type KindTally = { kind: Kind; count: number };

/** Every kind, including the ones at zero — a kind you never dump is information. */
export function tallyKinds(entries: Entry[]): KindTally[] {
  return KINDS.map((meta) => ({ kind: meta.value, count: entries.filter((e) => e.kind === meta.value).length }));
}

export type StateTally = { state: EntryState; count: number; pct: number };

/**
 * Every state, including the ones at zero, with its share of the whole — the
 * numbers behind the spread line on stats.
 *
 * `pct` is share of the total, not width against the biggest state the way the
 * kind bars read: the five segments are one bar and have to add up to it. The
 * rounding is per segment and can land a point either side of 100; a stacked
 * bar drawn from percentages absorbs that, and a legend that reads 33/33/33 is
 * the honest answer anyway.
 */
export function tallyStates(entries: Entry[]): StateTally[] {
  const total = entries.length;
  return ENTRY_STATES.map((meta) => {
    const count = entries.filter((entry) => entry.state === meta.value).length;
    return { state: meta.value, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

export function countLive(entries: Entry[]): number {
  return entries.filter((entry) => !entry.archived && isLive(entry.state)).length;
}

/** Case-insensitive substring, over the entry and every line appended to it. */
export function searchEntries(entries: Entry[], query: string): Entry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return entries.filter(
    (entry) =>
      entry.text.toLowerCase().includes(needle) ||
      entry.lines.some((line) => line.text.toLowerCase().includes(needle)),
  );
}
