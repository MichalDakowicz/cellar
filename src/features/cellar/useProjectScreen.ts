import { useMemo } from 'react';

import type { EntryListItem } from '@/components/cellar/EntryList';
import { useCellar } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { applyFilter, countLive, groupByDay, groupByKind, hasFilter, tallyKinds } from '@/lib/entryGroups';
import { ENTRY_STATES } from '@/lib/entryState';
import { dayLabel } from '@/lib/relTime';
import { repoLabel } from '@/lib/repoLink';
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

  const live = useMemo(() => all.filter((entry) => !entry.archived), [all]);

  // The desktop rail's two blocks. Derived here rather than in the route,
  // because a screen is a composition (PING.md §13) — and they are the same
  // numbers the meta line quotes, so they cannot disagree with it.
  const stateCounts = useMemo(
    () =>
      ENTRY_STATES.map((state) => ({
        value: state.value,
        label: state.label,
        color: state.color,
        count: live.filter((entry) => entry.state === state.value).length,
      })),
    [live],
  );

  const kindBars = useMemo(() => {
    const tallies = tallyKinds(live);
    const top = Math.max(1, ...tallies.map((tally) => tally.count));
    return tallies.map((tally) => ({ ...tally, pct: Math.round((tally.count / top) * 100) }));
  }, [live]);

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
    /** The tile's two letters, so the detail page wears the same mark as the grid. */
    initials: (project?.name ?? '').trim().slice(0, 2).toLowerCase() || '··',
    meta,
    /** Where it lives, when it has been linked. Null is the normal case. */
    repo: project && (project.repoPath || project.repoUrl)
      ? { label: repoLabel(project) ?? '', url: project.repoUrl, path: project.repoPath }
      : null,
    stateCounts,
    kindBars,
    entryCount: live.length,
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
    {
      type: 'section' as const,
      section: { key: group.kind, label: group.kind, meta: String(group.entries.length), kind: group.kind },
    },
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
