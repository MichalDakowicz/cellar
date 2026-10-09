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

/** One run as a row on the desk: what it is, where, and what it is up to. */
export type DeskRunCard = {
  id: string;
  title: string;
  /** project · agent · branch · age — whatever of it is known. */
  meta: string;
  /** The cellar project it works in, or its folder's name; what the desktop chat groups by. */
  project: string;
  /** What it is doing or wants right now ("wants to run npm i expo-av"); null when unknown. */
  detail: string | null;
  state: DeskRunState;
  startedAt: number;
  /** This desk started it and it is still going — a session opened at the pc is not ours to stop. */
  stoppable: boolean;
};

export function runMeta(parts: readonly (string | null | undefined)[]): string {
  return parts.filter((part): part is string => !!part && part.trim().length > 0).join(' · ');
}

/** Where the host is, in the few words the host card has room for. */
export type DeskHostLine = { online: boolean; line: string };

export function hostLine(via: 'bridge' | 'lan' | 'cellar' | 'none', checking: boolean): DeskHostLine {
  switch (via) {
    case 'bridge':
      return { online: true, line: 'this pc · cellar is running here' };
    case 'lan':
      return { online: true, line: 'awake · on this network' };
    case 'cellar':
      return { online: true, line: 'awake · reached through the cellar' };
    default:
      return { online: false, line: checking ? 'looking for it…' : 'not answering' };
  }
}

/** The line under "your desk": the host, how many runs are going, how many need you. */
export function deskSummary(input: { name: string; online: boolean; running: number; waiting: number }): string {
  const host = `${input.name} ${input.online ? 'is awake' : 'is not answering'}`;
  const parts = [host];
  if (input.running > 0) parts.push(`${input.running} ${input.running === 1 ? 'agent' : 'agents'} at work`);
  if (input.waiting > 0) parts.push(`${input.waiting} waiting on you`);
  return parts.join(' · ');
}
