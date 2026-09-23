import type { EntryListItem } from '@/components/cellar/EntryList';
import { collapseItems, toggleCollapsed } from '@/lib/entryCollapse';
import type { Entry } from '@/types/cellar';

const entry = (id: string): Entry => ({
  id,
  projectId: 'p1',
  text: id,
  kind: 'idea',
  state: 'open',
  importance: 'normal',
  position: 0,
  archived: false,
  createdAt: '2026-09-14T11:00:00.000Z',
  agent: null,
  lines: [],
  questions: [],
  docs: [],
});

const band = (key: string): EntryListItem => ({
  type: 'section',
  section: { key, label: key, band: { color: '#fff' } },
});

const kind = (key: string): EntryListItem => ({ type: 'section', section: { key, label: key, kind: 'idea' } });

const row = (id: string): EntryListItem => ({ type: 'entry', entry: entry(id) });

/**
 *   b:open
 *     open:glitch   → a, b
 *     open:idea     → c
 *   b:done
 *     done:idea     → d
 */
const items: EntryListItem[] = [
  band('b:open'),
  kind('open:glitch'),
  row('a'),
  row('b'),
  kind('open:idea'),
  row('c'),
  band('b:done'),
  kind('done:idea'),
  row('d'),
];

const keys = (list: EntryListItem[]) =>
  list.map((item) => (item.type === 'section' ? item.section.key : item.entry.id));

describe('collapseItems', () => {
  it('is the same array when nothing is folded', () => {
    expect(collapseItems(items, new Set())).toBe(items);
  });

  it('folds a kind heading and keeps the heading itself', () => {
    expect(keys(collapseItems(items, new Set(['open:glitch'])))).toEqual([
      'b:open',
      'open:glitch',
      'open:idea',
      'c',
      'b:done',
      'done:idea',
      'd',
    ]);
  });

  it('folds a band and takes its kind headings with it', () => {
    expect(keys(collapseItems(items, new Set(['b:open'])))).toEqual(['b:open', 'b:done', 'done:idea', 'd']);
  });

  // The boundary is the whole difficulty: the next band has to end the scope
  // and open its own in the same step.
  it('folds two bands in a row without swallowing the second heading', () => {
    expect(keys(collapseItems(items, new Set(['b:open', 'b:done'])))).toEqual(['b:open', 'b:done']);
  });

  it('lets a band fold while a kind inside it is also folded', () => {
    expect(keys(collapseItems(items, new Set(['b:open', 'open:glitch'])))).toEqual([
      'b:open',
      'b:done',
      'done:idea',
      'd',
    ]);
  });

  // The stream reading has day headings and nothing else, so every section is
  // the same level and the same rule has to fold them.
  it('folds a flat list of day headings', () => {
    const days: EntryListItem[] = [kind('d1'), row('a'), kind('d2'), row('b')];
    expect(keys(collapseItems(days, new Set(['d1'])))).toEqual(['d1', 'd2', 'b']);
  });

  it('ignores a key that is not in the list', () => {
    expect(keys(collapseItems(items, new Set(['nope'])))).toEqual(keys(items));
  });
});

describe('toggleCollapsed', () => {
  it('adds a key that was not folded and removes one that was', () => {
    expect([...toggleCollapsed(new Set(), 'b:open')]).toEqual(['b:open']);
    expect([...toggleCollapsed(new Set(['b:open']), 'b:open')]).toEqual([]);
  });

  it('never mutates the set it was given', () => {
    const before = new Set(['b:open']);
    toggleCollapsed(before, 'b:done');
    expect([...before]).toEqual(['b:open']);
  });
});
