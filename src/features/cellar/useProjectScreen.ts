import { useRouter } from 'expo-router';
import { useMemo } from 'react';

import type { EntryListItem } from '@/components/cellar/EntryList';
import type { BoardColumn } from '@/components/cellar/KanbanBoard';
import { useCellar } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import {
  applyFilter,
  countLive,
  groupByDay,
  groupByStateAndKind,
  hasFilter,
  tallyKinds,
  tallyStates,
} from '@/lib/entryGroups';
import { collapseItems } from '@/lib/entryCollapse';
import { kanbanColumns } from '@/lib/kanban';
import { effectiveCollapsed, foldedByDefault, sortForProject, type ProjectSort } from '@/lib/displayPrefs';
import { stateMeta } from '@/lib/entryState';
import { dayLabel } from '@/lib/relTime';
import { repoLabel } from '@/lib/repoLink';
import { plural } from '@/lib/utils';
import { useCellarPrefs, useCollapsedSections, useEntryFilter } from '@/store/cellarPrefs';
import type { Entry, Kind } from '@/types/cellar';

/**
 * One project, three ways to read it.
 *
 * **grouped** — every kind that has anything in it, in the fixed kind order, so
 * "what are the open glitches" is one glance. **stream** — one list cut into
 * days, so "what was I thinking about on Tuesday" is one glance. **kanban** —
 * the same rows stood up in columns, cut by state or by kind, so "what is in
 * flight" is one glance. They are the same entries and the same filter; only
 * the cut changes, which is why they share one hook rather than being three
 * screens.
 */
export function useProjectScreen(projectId: string | undefined) {
  const router = useRouter();
  const { projects, entries, loading, error, refetch } = useCellar();
  const { settings } = useCellarSettings();
  const toggled = useCollapsedSections((state) => state.collapsed);
  const toggleSection = useCollapsedSections((state) => state.toggle);
  const view = useCellarPrefs((state) => state.view);
  const setView = useCellarPrefs((state) => state.setView);
  const kanbanAxis = useCellarPrefs((state) => state.kanbanAxis);
  const setKanbanAxis = useCellarPrefs((state) => state.setKanbanAxis);
  const filter = useEntryFilter((state) => state.filter);

  const project = projects.find((candidate) => candidate.id === projectId) ?? null;

  const all = useMemo(
    () => entries.filter((entry) => entry.projectId === projectId),
    [entries, projectId],
  );

  const live = useMemo(() => all.filter((entry) => !entry.archived), [all]);

  // The desktop rail's two blocks. Derived here rather than in the route,
  // because a screen is a composition (PING.md §13) — and they are the same
  // numbers the meta line quotes, so they cannot disagree with it.
  //
  // The same shape stats draws, off the same tally, so a project and the whole
  // cellar are read the same way. It runs on `live`: the archive is a band at
  // the foot of the list, not a state, and counting it here would put a share
  // on the bar that the rest of the rail does not know about.
  const stateSpread = useMemo(
    () =>
      tallyStates(live).map((tally) => {
        const meta = stateMeta(tally.state);
        return { value: tally.state, label: meta.label, color: meta.color, count: tally.count, pct: tally.pct };
      }),
    [live],
  );

  const kindBars = useMemo(() => {
    const tallies = tallyKinds(live, settings.kindOrder);
    const top = Math.max(1, ...tallies.map((tally) => tally.count));
    return tallies.map((tally) => ({ ...tally, pct: Math.round((tally.count / top) * 100) }));
  }, [live, settings.kindOrder]);

  const visible = useMemo(
    () => sortForProject(applyFilter(all, filter), settings.projectSort),
    [all, filter, settings.projectSort],
  );
  const grouped = useMemo(() => {
    if (view === 'kanban') return [];
    return view === 'grouped'
      ? groupedItems(visible, settings.kindOrder)
      : streamItems(visible, settings.hideSettled, settings.projectSort);
  }, [visible, view, settings.kindOrder, settings.hideSettled, settings.projectSort]);

  // The board's own shape. Flattened here rather than in `lib/kanban`, because
  // `EntryListItem` is the list component's type and lib stays free of both
  // React and anything that imports it.
  const columns = useMemo<BoardColumn[]>(() => {
    if (view !== 'kanban') return [];
    return kanbanColumns(visible, kanbanAxis, settings.kindOrder).map((column) => ({
      key: column.key,
      label: column.label,
      band: column.band,
      kind: column.kind,
      count: column.entries.length,
      items: column.entries.map((entry) => ({ type: 'entry' as const, entry })),
    }));
  }, [visible, view, kanbanAxis, settings.kindOrder]);

  // Folding is applied here rather than inside the list, so what the list is
  // handed is what it draws — a virtualizer that filters its own data is a
  // virtualizer whose item count and its rows disagree.
  //
  // What is folded is your taps flipped over the defaults, so "hide done and
  // dropped" starts those headings folded and one tap still opens them.
  const collapsed = useMemo(
    () => effectiveCollapsed(toggled, foldedByDefault(settings.hideSettled)),
    [toggled, settings.hideSettled],
  );
  const items = useMemo(() => collapseItems(grouped, collapsed), [grouped, collapsed]);

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
    icon: project?.icon ?? null,
    meta,
    /** Where it lives, when it has been linked. Null is the normal case. */
    repo: project && (project.repoPath || project.repoUrl)
      ? { label: repoLabel(project) ?? '', url: project.repoUrl, path: project.repoPath }
      : null,
    stateSpread,
    kindBars,
    entryCount: live.length,
    view,
    setView,
    kanbanAxis,
    setKanbanAxis,
    items,
    columns,
    /** Everything the filter lets through, flat — what a multi-select resolves ids against. */
    onScreen: visible,
    collapsed,
    toggleSection,
    showCodes: settings.showCodes,
    kindOrder: settings.kindOrder,
    /** The drag-to-order screen for this project's thoughts. */
    arrange: () => projectId && router.push({ pathname: '/arrange', params: { what: 'entries', id: projectId } }),
    filtered,
    /** Nothing matches, versus nothing here yet — two different empties (PING.md §9.9). */
    emptyKind: all.length === 0 ? ('nothing' as const) : visible.length === 0 ? ('filtered' as const) : null,
  };
}

/**
 * State, then kind inside it, then the rows — flattened, because the list is
 * one FlashList and a list inside a list never re-measures (EntryList).
 *
 * The keys are prefixed with the band: the same kind appears under several
 * states, and two sections keyed `glitch` collapse into one row.
 */
function groupedItems(entries: Entry[], kindOrder: Kind[] | null): EntryListItem[] {
  return groupByStateAndKind(entries, kindOrder).flatMap((band) => [
    {
      type: 'section' as const,
      section: {
        key: `b:${band.band}`,
        label: band.band,
        meta: String(band.count),
        band: {
          color: band.band === 'archived' ? stateMeta('dropped').color : stateMeta(band.band).color,
          dim: band.band === 'archived' || band.band === 'dropped',
        },
      },
    },
    ...band.kinds.flatMap((group) => [
      {
        type: 'section' as const,
        section: {
          key: `${band.band}:${group.kind}`,
          label: group.kind,
          meta: String(group.entries.length),
          kind: group.kind,
        },
      },
      ...group.entries.map((entry) => ({ type: 'entry' as const, entry })),
    ]),
  ]);
}

/**
 * Days, in the project's sort. With "hide done and dropped" on, the settled
 * rows leave the days and wait in one band at the foot — folded by default
 * (`foldedByDefault`), so the stream reads as what is still work.
 */
function streamItems(entries: Entry[], hideSettled: boolean, sort: ProjectSort): EntryListItem[] {
  const isSettled = (entry: Entry) => stateMeta(entry.state).settled;
  const settled = hideSettled ? entries.filter(isSettled) : [];
  const days = hideSettled ? entries.filter((entry) => !isSettled(entry)) : entries;
  const out: EntryListItem[] = groupByDay(days, sort).flatMap((group) => [
    {
      type: 'section' as const,
      section: { key: group.key, label: dayLabel(group.key), meta: String(group.entries.length) },
    },
    ...group.entries.map((entry) => ({ type: 'entry' as const, entry })),
  ]);
  if (settled.length === 0) return out;
  return [
    ...out,
    {
      type: 'section' as const,
      section: {
        key: 's:settled',
        label: 'done and dropped',
        meta: String(settled.length),
        band: { color: stateMeta('dropped').color, dim: true },
      },
    },
    ...settled.map((entry) => ({ type: 'entry' as const, entry })),
  ];
}
