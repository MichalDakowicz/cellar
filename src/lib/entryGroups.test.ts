import {
  applyFilter,
  countLive,
  countLiveOfKind,
  filterSummary,
  groupByDay,
  groupByKind,
  groupByStateAndKind,
  hasFilter,
  NO_FILTER,
  recentEntries,
  searchEntries,
  tallyKinds,
  tallyStates,
} from '@/lib/entryGroups';
import { ENTRY_STATES } from '@/lib/entryState';
import { KINDS } from '@/lib/kinds';
import type { Entry, Kind } from '@/types/cellar';

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
  questions: [],
  docs: [],
  ...over,
});

const at = (iso: string) => entry({ createdAt: iso });

describe('applyFilter', () => {
  it('leaves the archive alone — the archive is a band, not a narrowing', () => {
    const entries = [entry(), entry({ archived: true })];
    expect(applyFilter(entries, NO_FILTER)).toHaveLength(2);
  });

  it('treats several kinds as any-of', () => {
    const entries = [entry({ kind: 'glitch' }), entry({ kind: 'idea' }), entry({ kind: 'copy' })];
    const kinds: Kind[] = ['glitch', 'copy'];
    expect(applyFilter(entries, { ...NO_FILTER, kinds }).map((e) => e.kind)).toEqual(['glitch', 'copy']);
  });

  it('narrows to one state, and null means any', () => {
    const entries = [entry({ state: 'open' }), entry({ state: 'done' })];
    expect(applyFilter(entries, { ...NO_FILTER, state: 'done' })).toHaveLength(1);
    expect(applyFilter(entries, NO_FILTER)).toHaveLength(2);
  });

  it('is on once a kind or a state is picked', () => {
    expect(hasFilter(NO_FILTER)).toBe(false);
    expect(hasFilter({ ...NO_FILTER, kinds: ['glitch'] })).toBe(true);
    expect(hasFilter({ ...NO_FILTER, state: 'doing' })).toBe(true);
  });
});

describe('filterSummary', () => {
  it('says any kind when nothing is picked', () => {
    expect(filterSummary(NO_FILTER)).toBe('any kind');
  });

  it('joins the kinds and appends the state', () => {
    expect(filterSummary({ kinds: ['glitch', 'question'], state: 'doing' })).toBe('glitch · question · doing');
  });
});

describe('groupByStateAndKind', () => {
  it('bands by state, and keeps the kind cut inside each band', () => {
    const groups = groupByStateAndKind([
      entry({ state: 'open', kind: 'idea' }),
      entry({ state: 'open', kind: 'glitch' }),
      entry({ state: 'done', kind: 'idea' }),
    ]);
    expect(groups.map((g) => g.band)).toEqual(['open', 'done']);
    expect(groups[0].kinds.map((k) => k.kind)).toEqual(['glitch', 'idea']);
    expect(groups[0].count).toBe(2);
  });

  it('puts blocked at the top and the archive at the foot, whatever state it was in', () => {
    const groups = groupByStateAndKind([
      entry({ state: 'done', archived: true }),
      entry({ state: 'open' }),
      entry({ state: 'blocked' }),
    ]);
    expect(groups.map((g) => g.band)).toEqual(['blocked', 'open', 'archived']);
  });

  it('drops the bands with nothing in them', () => {
    expect(groupByStateAndKind([entry({ state: 'doing' })]).map((g) => g.band)).toEqual(['doing']);
    expect(groupByStateAndKind([])).toEqual([]);
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

describe('tallyStates', () => {
  it('keeps every state, in the order the spread line draws them', () => {
    const tallies = tallyStates([entry({ state: 'open' })]);
    expect(tallies.map((t) => t.state)).toEqual(ENTRY_STATES.map((s) => s.value));
    expect(tallies.find((t) => t.state === 'blocked')?.count).toBe(0);
  });

  it('reads pct as share of the whole, not against the biggest state', () => {
    const entries = [
      entry({ state: 'open' }),
      entry({ state: 'open' }),
      entry({ state: 'open' }),
      entry({ state: 'done' }),
    ];
    const tallies = tallyStates(entries);
    expect(tallies.find((t) => t.state === 'open')).toMatchObject({ count: 3, pct: 75 });
    expect(tallies.find((t) => t.state === 'done')).toMatchObject({ count: 1, pct: 25 });
  });

  it('is all zeroes on an empty cellar rather than NaN', () => {
    expect(tallyStates([]).every((t) => t.count === 0 && t.pct === 0)).toBe(true);
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

describe('countLiveOfKind', () => {
  it('stops counting a glitch once it is settled, so a fixed project reads clean', () => {
    const entries = [
      entry({ kind: 'glitch', state: 'done' }),
      entry({ kind: 'glitch', state: 'dropped' }),
      entry({ kind: 'idea', state: 'open' }),
    ];
    expect(countLiveOfKind(entries, 'glitch')).toBe(0);
  });

  it('counts the live ones of that kind and nothing else', () => {
    const entries = [
      entry({ kind: 'glitch', state: 'open' }),
      entry({ kind: 'glitch', state: 'doing' }),
      entry({ kind: 'glitch', state: 'blocked' }),
      entry({ kind: 'glitch', state: 'done' }),
      entry({ kind: 'glitch', state: 'open', archived: true }),
      entry({ kind: 'idea', state: 'open' }),
    ];
    expect(countLiveOfKind(entries, 'glitch')).toBe(3);
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

describe('recentEntries', () => {
  const at = (id: string, createdAt: string, archived = false): Entry =>
    entry({ id, createdAt, archived });

  it('reads the whole cellar, newest first', () => {
    const got = recentEntries([at('a', '2026-01-01T00:00:00Z'), at('c', '2026-03-01T00:00:00Z'), at('b', '2026-02-01T00:00:00Z')], 12);
    expect(got.map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('caps at the limit', () => {
    const many = ['a', 'b', 'c', 'd'].map((id, index) => at(id, `2026-01-0${index + 1}T00:00:00Z`));
    expect(recentEntries(many, 2)).toHaveLength(2);
  });

  // A thought you filed away is not what you were last thinking about.
  it('leaves the archive out', () => {
    const got = recentEntries([at('kept', '2026-01-01T00:00:00Z'), at('gone', '2026-02-01T00:00:00Z', true)], 12);
    expect(got.map((e) => e.id)).toEqual(['kept']);
  });

  it('is empty on an empty cellar rather than throwing', () => {
    expect(recentEntries([], 12)).toEqual([]);
  });
});
