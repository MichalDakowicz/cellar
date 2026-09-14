import { DEFAULT_TAB, ENTRY_TABS, filterByTab, isEntryTab, matchesTab, tabCounts } from '@/lib/entryTabs';
import type { Entry } from '@/types/cellar';

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
  ...over,
});

describe('matchesTab', () => {
  it('keeps an archived entry out of its own state tab', () => {
    const put_away = entry({ state: 'done', archived: true });
    expect(matchesTab(put_away, 'done')).toBe(false);
    expect(matchesTab(put_away, 'archived')).toBe(true);
  });

  it('puts a live entry under its state and nowhere else', () => {
    const doing = entry({ state: 'doing' });
    expect(ENTRY_TABS.filter((tab) => matchesTab(doing, tab))).toEqual(['doing']);
  });
});

describe('filterByTab', () => {
  it('cuts the list to one tab', () => {
    const entries = [entry({ state: 'open' }), entry({ state: 'done' }), entry({ archived: true })];
    expect(filterByTab(entries, DEFAULT_TAB)).toHaveLength(1);
    expect(filterByTab(entries, 'archived')).toHaveLength(1);
  });
});

describe('tabCounts', () => {
  it('keeps every tab, in the order the row draws them', () => {
    const counts = tabCounts([entry({ state: 'doing' })]);
    expect(counts.map((row) => row.tab)).toEqual(ENTRY_TABS);
    expect(counts.find((row) => row.tab === 'doing')?.count).toBe(1);
    expect(counts.find((row) => row.tab === 'dropped')?.count).toBe(0);
  });

  it('labels a tab with the state its rows are badged with', () => {
    expect(tabCounts([]).map((row) => row.label)).toEqual([
      'blocked',
      'open',
      'doing',
      'done',
      'dropped',
      'archived',
    ]);
  });
});

describe('isEntryTab', () => {
  it('takes the six and nothing else', () => {
    expect(isEntryTab('archived')).toBe(true);
    expect(isEntryTab('todo')).toBe(false);
  });
});
