import type { DeskRunState } from './deskProtocol';

/**
 * The desktop chat's run list (docs/desk/screens.md, `DeskChat.dc.html`): runs
 * grouped by project, what needs you first, with all · waiting · running and a
 * search.
 *
 * Pure: the list on the desktop and anything later that jumps between runs
 * order them the same way.
 */

export type RunFilter = 'all' | 'waiting' | 'running';

type Listed = { project: string; title: string; meta: string; state: DeskRunState; startedAt: number };

const RANK: Record<DeskRunState, number> = { waiting: 0, running: 1, done: 2, failed: 2, stopped: 2 };

export function runFilterCounts(runs: readonly Pick<Listed, 'state'>[]): Record<RunFilter, number> {
  return {
    all: runs.length,
    waiting: runs.filter((run) => run.state === 'waiting').length,
    running: runs.filter((run) => run.state === 'running').length,
  };
}

/** "$solar claude" — every word must appear in the run's project, title or meta. */
function matches(run: Listed, query: string): boolean {
  const words = query.toLowerCase().replace(/\$/g, '').split(/\s+/).filter(Boolean);
  const haystack = `${run.project} ${run.title} ${run.meta}`.toLowerCase();
  return words.every((word) => haystack.includes(word));
}

function byNeed(a: Listed, b: Listed): number {
  return RANK[a.state] - RANK[b.state] || b.startedAt - a.startedAt;
}

export function runGroups<T extends Listed>(runs: readonly T[], filter: RunFilter, query: string): { project: string; runs: T[] }[] {
  const shown = runs.filter((run) => (filter === 'all' || run.state === filter) && matches(run, query));
  const groups = new Map<string, T[]>();
  for (const run of shown) groups.set(run.project, [...(groups.get(run.project) ?? []), run]);

  return [...groups.entries()]
    .map(([project, list]) => ({ project, runs: list.sort(byNeed) }))
    .sort((a, b) => byNeed(a.runs[0], b.runs[0]));
}
