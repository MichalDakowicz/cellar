import type { DeskRun, DeskRunState } from './deskProtocol';

/**
 * How the desk draws a run — its chip and where it sits on the desk tab
 * (docs/desk/screens.md, "desk tab").
 *
 * Pure: the phone's desk tab, the desktop's home and a notification all read
 * the same chip off the same state, so they can never disagree about whether a
 * run is waiting on you.
 */

export type RunChipMeta = { label: string; color: string; tint: string };

// Same hues and the same 0.16 tint as the entry states (lib/entryState), so a
// run waiting on you and a blocked thought are visibly the same kind of stall.
const CHIPS: Record<DeskRunState, RunChipMeta> = {
  waiting: { label: 'waiting', color: '#ef4444', tint: 'rgba(239,68,68,0.16)' },
  running: { label: 'doing', color: '#f59e0b', tint: 'rgba(245,158,11,0.16)' },
  done: { label: 'done', color: '#22c55e', tint: 'rgba(34,197,94,0.16)' },
  failed: { label: 'failed', color: '#ef4444', tint: 'rgba(239,68,68,0.16)' },
  stopped: { label: 'stopped', color: 'hsl(0 0% 63.9%)', tint: 'rgba(163,163,163,0.16)' },
};

export function runChip(state: DeskRunState): RunChipMeta {
  return CHIPS[state] ?? CHIPS.stopped;
}

export type DeskRunSections<T> = { waiting: T[]; running: T[]; lately: T[] };

/** How many finished runs "lately" keeps — the desk is what is going, not a history. */
export const LATELY_MAX = 5;

/**
 * Waiting → running → lately. What needs you first, then what is going, then
 * the last few that finished; newest first inside each.
 */
export function deskSections<T extends Pick<DeskRun, 'state' | 'startedAt'>>(
  runs: readonly T[],
): DeskRunSections<T> {
  const newest = [...runs].sort((a, b) => b.startedAt - a.startedAt);
  return {
    waiting: newest.filter((run) => run.state === 'waiting'),
    running: newest.filter((run) => run.state === 'running'),
    lately: newest.filter((run) => run.state !== 'waiting' && run.state !== 'running').slice(0, LATELY_MAX),
  };
}
