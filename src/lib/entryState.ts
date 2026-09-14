import type { EntryState } from '@/types/cellar';

/**
 * What has happened to a thought since you dumped it.
 *
 * Tints are written-out `rgba()` and never `colour + '22'` — that trick only
 * works on hex, and concatenating onto an `hsl(...)` yields a string React
 * Native silently resolves to an opaque block, painting over the chip's own
 * label (PING.md §4.4). Alpha is always 0.16.
 */
export type StateMeta = {
  value: EntryState;
  label: EntryState;
  color: string;
  tint: string;
  /**
   * `open` is most of the cellar, and a badge on almost every row is noise, so
   * the default state is never badged (PING.md §4.4). Badge the exception.
   */
  badged: boolean;
  /** Settled either way — the row renders dimmed, because it is no longer work. */
  settled: boolean;
};

export const ENTRY_STATES: StateMeta[] = [
  { value: 'open', label: 'open', color: 'hsl(0 0% 63.9%)', tint: 'rgba(163,163,163,0.16)', badged: false, settled: false },
  { value: 'doing', label: 'doing', color: '#f59e0b', tint: 'rgba(245,158,11,0.16)', badged: true, settled: false },
  // The only state the user does not set. An agent that cannot answer a
  // question from the repo leaves it here with the question appended, so this
  // badge means one thing: it is waiting on you, and nothing moves until you
  // answer. Red because it is the one state that is stalled.
  { value: 'blocked', label: 'blocked', color: '#ef4444', tint: 'rgba(239,68,68,0.16)', badged: true, settled: false },
  { value: 'done', label: 'done', color: '#22c55e', tint: 'rgba(34,197,94,0.16)', badged: true, settled: true },
  { value: 'dropped', label: 'dropped', color: 'hsl(0 0% 63.9%)', tint: 'rgba(163,163,163,0.16)', badged: true, settled: true },
];

export const DEFAULT_STATE: EntryState = 'open';

/** Still work. What the shelf tile counts, and what the stats call open. */
export const LIVE_STATES: EntryState[] = ['open', 'doing', 'blocked'];

const BY_VALUE = new Map(ENTRY_STATES.map((state) => [state.value, state]));

/** The only accessor. */
export function stateMeta(value: string | null | undefined): StateMeta {
  return BY_VALUE.get(value as EntryState) ?? BY_VALUE.get(DEFAULT_STATE)!;
}

export function isEntryState(value: unknown): value is EntryState {
  return typeof value === 'string' && BY_VALUE.has(value as EntryState);
}

export function isLive(value: EntryState): boolean {
  return LIVE_STATES.includes(value);
}
