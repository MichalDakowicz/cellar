import { deskCountLine, deskCounts } from './deskCounts';
import { DESK_SEEN_MS } from './deskProtocol';

const now = Date.parse('2026-10-10T12:00:00Z');
const input: Parameters<typeof deskCounts>[0] = {
  via: 'lan', entriesState: 'ready', runsState: 'ready', snapshotAt: null, now,
  entries: [
    { id: 'one', state: 'blocked', archived: false },
    { id: 'two', state: 'blocked', archived: false },
    { id: 'archived', state: 'blocked', archived: true },
    { id: 'done', state: 'done', archived: false },
  ],
  runs: [
    { id: 'waiting', state: 'waiting' }, { id: 'working', state: 'running' },
    { id: 'done', state: 'done' }, { id: 'failed', state: 'failed' }, { id: 'stopped', state: 'stopped' },
  ],
};

it('counts global blocked entries and host waiting runs; waiting is not working', () => {
  expect(deskCounts(input)).toEqual({ state: 'ready', working: 1, waiting: 3, blockedEntries: 2, waitingRuns: 1, snapshotAt: null });
  expect(deskCountLine(deskCounts(input))).toBe('1 working · 3 waiting on you');
});

it('keeps confirmed empty distinct from unknown, with the same bridge totals', () => {
  const counts = deskCounts({ ...input, via: 'bridge', entries: [], runs: [] });
  expect(counts.working).toBe(0);
  expect(counts.waiting).toBe(0);
  expect(deskCountLine(counts)).toBe('0 working · 0 waiting on you');
});

it.each([
  { via: 'none' as const },
  { via: 'none' as const, checking: true },
  { runsState: 'loading' as const },
  { entriesState: 'loading' as const },
  { runsState: 'failed' as const },
  { entriesState: 'failed' as const },
])('suppresses numeric totals despite retained cached data: %j', (change) => {
  const counts = deskCounts({ ...input, ...change });
  expect(counts.working).toBeNull();
  expect(counts.waiting).toBeNull();
  expect(counts.snapshotAt).toBeNull();
  expect(deskCountLine(counts)).not.toMatch(/\d/);
});

it('labels a recent mailbox snapshot and expires it without optimistic reconnect data', () => {
  const snapshotAt = new Date(now - 30_000).toISOString();
  const mailbox = { ...input, via: 'cellar' as const, snapshotAt };
  const snapshot = deskCounts(mailbox);
  expect(snapshot.state).toBe('snapshot');
  expect(snapshot.snapshotAt).toBe(snapshotAt);
  expect(deskCountLine(snapshot, now)).toContain('snapshot just now');
  expect(deskCounts({ ...mailbox, now: now + DESK_SEEN_MS }).waiting).toBeNull();
  expect(deskCounts({ ...mailbox, snapshotAt: 'invalid' }).working).toBeNull();
});

it('excludes samples and duplicate records without merging an entry and run with the same id', () => {
  const counts = deskCounts({
    ...input,
    entries: [...input.entries, input.entries[0], { id: 'sample-question', state: 'blocked', archived: false }],
    runs: [...input.runs, input.runs[0], { id: 'one', state: 'waiting' }, { id: 'sample-1', state: 'waiting' }, { id: 'sample-2', state: 'running' }],
  });
  expect(counts.working).toBe(1);
  expect(counts.waiting).toBe(4);
});

it('removes only confirmed blockers after an answer or host state update', () => {
  expect(deskCounts(input).waiting).toBe(3);
  const answered = input.entries.map((entry) => entry.id === 'one' ? { ...entry, state: 'open' as const } : entry);
  const resumed = input.runs.map((run) => run.id === 'waiting' ? { ...run, state: 'running' as const } : run);
  expect(deskCounts({ ...input, entries: answered }).waiting).toBe(2);
  expect(deskCounts({ ...input, entries: answered, runs: resumed })).toMatchObject({ working: 2, waiting: 1 });
});
