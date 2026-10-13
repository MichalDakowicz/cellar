import type { DeskVia } from './deskLink';
import { isDeskSeen, type DeskRun } from './deskProtocol';
import { longRel } from './relTime';
import type { Entry } from '../types/cellar';

type ReadState = 'loading' | 'failed' | 'ready';
export type DeskCountState = ReadState | 'disconnected' | 'snapshot';
type CountEntry = Pick<Entry, 'id' | 'state' | 'archived'>;
type CountRun = Pick<DeskRun, 'id' | 'state'>;

export type DeskCounts = {
  state: DeskCountState;
  working: number | null;
  waiting: number | null;
  blockedEntries: number | null;
  waitingRuns: number | null;
  snapshotAt: string | null;
};

/** Real, global totals. Unknown is null; a successful empty read is zero. */
export function deskCounts(input: {
  via: DeskVia;
  entries: readonly CountEntry[];
  entriesState: ReadState;
  runs: readonly CountRun[];
  runsState: ReadState;
  snapshotAt: string | null;
  checking?: boolean;
  now?: number;
}): DeskCounts {
  let state: DeskCountState;
  if (input.via === 'none') state = input.checking ? 'loading' : 'disconnected';
  else if (input.via === 'cellar' && !isDeskSeen(input.snapshotAt, input.now ?? Date.now())) state = 'disconnected';
  else if (input.entriesState === 'failed' || input.runsState === 'failed') state = 'failed';
  else if (input.entriesState !== 'ready' || input.runsState !== 'ready') state = 'loading';
  else state = input.via === 'cellar' ? 'snapshot' : 'ready';

  if (state !== 'ready' && state !== 'snapshot') {
    return { state, working: null, waiting: null, blockedEntries: null, waitingRuns: null, snapshotAt: null };
  }
  const entries = new Map(input.entries.filter((entry) => !entry.id.startsWith('sample-')).map((entry) => [entry.id, entry]));
  const runs = new Map(input.runs.filter((run) => !run.id.startsWith('sample-')).map((run) => [run.id, run]));
  const blockedEntries = [...entries.values()].filter((entry) => entry.state === 'blocked' && !entry.archived).length;
  const waitingRuns = [...runs.values()].filter((run) => run.state === 'waiting').length;
  return {
    state,
    working: [...runs.values()].filter((run) => run.state === 'running').length,
    waiting: blockedEntries + waitingRuns,
    blockedEntries,
    waitingRuns,
    snapshotAt: state === 'snapshot' ? input.snapshotAt : null,
  };
}

/** Shared header copy, including the provenance of mailbox counts. */
export function deskCountLine(counts: DeskCounts, now: number = Date.now()): string {
  if (counts.state === 'disconnected') return '';
  if (counts.state === 'loading') return 'reading counts…';
  if (counts.state === 'failed') return 'counts unavailable';
  const totals = `${counts.working} working · ${counts.waiting} waiting on you`;
  return counts.snapshotAt ? `${totals} · snapshot ${longRel(counts.snapshotAt, now)}` : totals;
}
