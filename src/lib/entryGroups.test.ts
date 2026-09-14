import {
  applyFilter,
  countLive,
  filterSummary,
  groupByDay,
  groupByKind,
  hasFilter,
  NO_FILTER,
  searchEntries,
  tallyKinds,
} from '@/lib/entryGroups';
import { KINDS } from '@/lib/kinds';
import type { Entry, EntryState, Kind } from '@/types/cellar';

let seq = 0;
const entry = (over: Partial<Entry> = {}): Entry => ({
  id: `e${seq++}`,
  projectId: 'p1',
  text: 'a thought',
  kind: 'idea',
  state: 'open',
  archived: false,
  createdAt: '2026-09-13T10:00:00.000Z',
  agent: null,
  lines: [],
  ...over,
});

const at = (iso: string) => entry({ createdAt: iso });

describe('applyFilter', () => {
  it('hides archived entries until they are asked for', () => {
    const entries = [entry(), entry({ archived: true })];
    expect(applyFilter(entries, NO_FILTER)).toHaveLength(1);
    expect(applyFilter(entries, { ...NO_FILTER, showArchived: true })).toHaveLength(2);
  });

  it('treats several kinds as any-of', () => {
    const entries = [entry({ kind: 'glitch' }), entry({ kind: 'idea' }), entry({ kind: 'copy' })];
    const kinds: Kind[] = ['glitch', 'copy'];
    expect(applyFilter(entries, { ...NO_FILTER, kinds }).map((e) => e.kind)).toEqual(['glitch', 'copy']);
  });

  it('narrows to one state, and null means any', () => {
    const entries = [entry({ state: 'open' }), entry({ state: 'done' })];
    const state: EntryState = 'done';
    expect(applyFilter(entries, { ...NO_FILTER, state })).toHaveLength(1);
    expect(applyFilter(entries, NO_FILTER)).toHaveLength(2);
  });

  it('does not count showArchived as a filter — it is a disclosure, not a narrowing', () => {
    expect(hasFilter({ ...NO_FILTER, showArchived: true })).toBe(false);
    expect(hasFilter({ ...NO_FILTER, state: 'doing' })).toBe(true);
  });
});

describe('filterSummary', () => {
  it('says any kind when nothing is picked', () => {
    expect(filterSummary(NO_FILTER)).toBe('any kind');
  });

  it('joins the kinds and appends the state', () => {
    expect(filterSummary({ kinds: ['glitch', 'question'], state: 'doing', showArchived: false })).toBe(
      'glitch · question · doing',
    );
  });
});

describe('groupByKind', () => {
  it('keeps the fixed kind order rather than sorting by size', () => {
    const entries = [entry({ kind: 'design' }), entry({ kind: 'idea' }), entry({ kind: 'design' })];
    expect(groupByKind(entries).map((g) => g.kind)).toEqual(['idea', 'design']);
  });

  it('drops empty kinds entirely', () => {
    expect(groupByKind([entry({ kind: 'idea' })])).toHaveLength(1);
  });

  it('carries the mono code so the gutter does not re-derive it', () => {
    expect(groupByKind([entry({ kind: 'glitch' })])[0].code).toBe('bug');
  });
});

describe('groupByDay', () => {
  it('cuts the stream into days, newest first', () => {
    const groups = groupByDay([
      at('2026-09-11T09:00:00.000Z'),
      at('2026-09-13T09:00:00.000Z'),
      at('2026-09-13T18:00:00.000Z'),
    ]);
    expect(groups.map((g) => g.entries.length)).toEqual([2, 1]);
    expect(groups[0].key > groups[1].key).toBe(true);
  });

  it('orders within a day newest first too', () => {
    const groups = groupByDay([at('2026-09-13T09:00:00.000Z'), at('2026-09-13T18:00:00.000Z')]);
    expect(groups[0].entries[0].createdAt).toBe('2026-09-13T18:00:00.000Z');
  });
});

describe('tallyKinds', () => {
  it('keeps kinds at zero — a kind you never dump is information', () => {
    expect(tallyKinds([entry({ kind: 'idea' })])).toHaveLength(KINDS.length);
    expect(tallyKinds([entry({ kind: 'idea' })]).find((t) => t.kind === 'copy')?.count).toBe(0);
  });
});

describe('countLive', () => {
  it('counts open and doing, and never an archived row', () => {
    const entries = [
      entry({ state: 'open' }),
      entry({ state: 'doing' }),
      entry({ state: 'done' }),
      entry({ state: 'dropped' }),
      entry({ state: 'open', archived: true }),
    ];
    expect(countLive(entries)).toBe(2);
  });
});

describe('searchEntries', () => {
  it('finds appended lines, not just the first one', () => {
    const grown = entry({ text: 'nothing here', lines: [{ id: 'l1', text: 'automerge', createdAt: '', source: 'user' }] });
    expect(searchEntries([grown], 'AUTOMERGE')).toHaveLength(1);
  });

  it('returns nothing for an empty query rather than everything', () => {
    expect(searchEntries([entry()], '   ')).toEqual([]);
  });
});
