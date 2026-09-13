import { useMemo } from 'react';

import { useCellar } from '@/features/cellar/useCellar';
import { countLive, tallyKinds } from '@/lib/entryGroups';
import { plural } from '@/lib/utils';
import { useCellarPrefs } from '@/store/cellarPrefs';

/**
 * What you dump, narrowed to one shelf or across all of them.
 *
 * The scope is the left island's action here, and a shelf rather than a date
 * range — Cellar has no cadence to measure, and "how much have I thought about
 * mods this month" is a question about the shelf, not the month. All-shelves
 * scope also includes the inbox, because an unfiled thought is still a thought
 * you had.
 */
export function useStatsScreen() {
  const { shelves, projects, entries, loading, error, refetch } = useCellar();
  const shelfId = useCellarPrefs((state) => state.statsShelfId);
  const setStatsShelf = useCellarPrefs((state) => state.setStatsShelf);

  // A shelf deleted on another device leaves the pref pointing at nothing; fall
  // back to every shelf rather than to an empty page of zeroes.
  const scope = shelves.find((shelf) => shelf.id === shelfId) ?? null;
  const scopeName = scope?.name ?? 'every shelf';

  const scoped = useMemo(() => {
    if (!scope) return entries;
    const ids = new Set(projects.filter((project) => project.shelfId === scope.id).map((project) => project.id));
    return entries.filter((entry) => entry.projectId !== null && ids.has(entry.projectId));
  }, [entries, projects, scope]);

  const scopedProjects = useMemo(
    () => (scope ? projects.filter((project) => project.shelfId === scope.id) : projects),
    [projects, scope],
  );

  const kindBars = useMemo(() => {
    const tallies = tallyKinds(scoped);
    const peak = Math.max(1, ...tallies.map((tally) => tally.count));
    return tallies.map((tally) => ({ ...tally, pct: Math.round((tally.count / peak) * 100) }));
  }, [scoped]);

  const busiest = useMemo(
    () =>
      scopedProjects
        .map((project) => {
          const mine = scoped.filter((entry) => entry.projectId === project.id);
          return {
            id: project.id,
            name: project.name,
            count: mine.length,
            meta: `${plural(mine.length, 'entry', 'entries')} · ${countLive(mine)} open`,
          };
        })
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [scopedProjects, scoped],
  );

  return {
    loading,
    error,
    refetch,
    shelves,
    shelfId: scope?.id ?? null,
    setStatsShelf,
    scopeName,
    total: scoped.length,
    open: countLive(scoped),
    projectCount: scopedProjects.length,
    kindBars,
    busiest,
    isEmpty: scoped.length === 0,
  };
}
