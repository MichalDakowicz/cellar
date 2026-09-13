import { useMemo } from 'react';

import type { EntryListItem } from '@/components/cellar/EntryList';
import { useCellar } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { applyFilter, countLive, groupByDay, groupByKind, hasFilter } from '@/lib/entryGroups';
import { dayLabel } from '@/lib/relTime';
import { plural } from '@/lib/utils';
import { useCellarPrefs, useEntryFilter } from '@/store/cellarPrefs';
import type { Entry } from '@/types/cellar';

/**
 * One project, two ways to read it.
 *
 * **grouped** — every kind that has anything in it, in the fixed kind order, so
 * "what are the open glitches" is one glance. **stream** — one list cut into
 * days, so "what was I thinking about on Tuesday" is one glance. They are the
 * same entries and the same filter; only the cut changes, which is why they
 * share one hook and one list rather than being two screens.
 */
export function useProjectScreen(projectId: string | undefined) {
  const { projects, entries, loading, error, refetch } = useCellar();
  const { settings } = useCellarSettings();
  const view = useCellarPrefs((state) => state.view);
  const setView = useCellarPrefs((state) => state.setView);
  const filter = useEntryFilter((state) => state.filter);
  const setFilter = useEntryFilter((state) => state.setFilter);

  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  const all = useMemo(
    () => entries.filter((entry) => entry.projectId === projectId),
    [entries, projectId],
  );

  const visible = useMemo(() => applyFilter(all, filter), [all, filter]);
  const items = useMemo(() => (view === 'grouped' ? groupedItems(visible) : streamItems(visible)), [visible, view]);
  const archivedCount = all.filter((entry) => entry.archived).length;

  const filtered = hasFilter(filter);
  const meta = [
    plural(all.filter((entry) => !entry.archived).length, 'entry', 'entries'),
    `${countLive(all)} open`,
    filtered ? 'filtered' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    loading,
    error,
    refetch,
    project,
    name: project?.name ?? 'project',
    meta,
    view,
    setView,
    items,
    showCodes: settings.showCodes,
    filtered,
    archivedCount,
    showArchived: filter.showArchived,
    toggleArchived: () => setFilter({ ...filter, showArchived: !filter.showArchived }),
    /** Nothing matches, versus nothing here yet — two different empties (PING.md §9.9). */
    emptyKind: all.length === 0 ? ('nothing' as const) : visible.length === 0 ? ('filtered' as const) : null,
  };
}

function groupedItems(entries: Entry[]): EntryListItem[] {
  return groupByKind(entries).flatMap((group) => [
    { type: 'section' as const, section: { key: group.kind, label: group.kind, meta: String(group.entries.length) } },
    ...group.entries.map((entry) => ({ type: 'entry' as const, entry })),
  ]);
}

function streamItems(entries: Entry[]): EntryListItem[] {
  return groupByDay(entries).flatMap((group) => [
    {
      type: 'section' as const,
      section: { key: group.key, label: dayLabel(group.key), meta: String(group.entries.length) },
    },
    ...group.entries.map((entry) => ({ type: 'entry' as const, entry })),
  ]);
}
