import { selectedEntries, sharedProjectId, toggleSelected } from '@/lib/entrySelection';
import type { Entry } from '@/types/cellar';

let seq = 0;
const entry = (over: Partial<Entry> = {}): Entry => ({
  id: `e${seq++}`,
  projectId: 'p1',
  text: 'a thought',
  kind: 'idea',
  state: 'open',
  importance: 'normal',
  archived: false,
  createdAt: '2026-09-20T10:00:00.000Z',
  agent: null,
  lines: [],
  questions: [],
  ...over,
});

describe('toggleSelected', () => {
  it('adds at the end, so the pick order survives', () => {
    expect(toggleSelected(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('removes one that is already held', () => {
    expect(toggleSelected(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('does not mutate what it was given', () => {
    const held = ['a'];
    toggleSelected(held, 'b');
    expect(held).toEqual(['a']);
  });
});

describe('selectedEntries', () => {
  it('reads back in the order they were picked, not the order of the list', () => {
    const a = entry({ id: 'a' });
    const b = entry({ id: 'b' });
    expect(selectedEntries([a, b], ['b', 'a']).map((e) => e.id)).toEqual(['b', 'a']);
  });

  it('drops an id whose entry has gone', () => {
    const a = entry({ id: 'a' });
    expect(selectedEntries([a], ['a', 'gone'])).toEqual([a]);
  });
});

describe('sharedProjectId', () => {
  it('names the project when they all live in it', () => {
    expect(sharedProjectId([entry({ projectId: 'p1' }), entry({ projectId: 'p1' })])).toBe('p1');
  });

  it('is null when the selection spans projects', () => {
    expect(sharedProjectId([entry({ projectId: 'p1' }), entry({ projectId: 'p2' })])).toBeNull();
  });

  it('is null for the inbox, where there is no project to name', () => {
    expect(sharedProjectId([entry({ projectId: null }), entry({ projectId: null })])).toBeNull();
  });

  it('is null when one of them is unfiled', () => {
    expect(sharedProjectId([entry({ projectId: 'p1' }), entry({ projectId: null })])).toBeNull();
  });

  it('is null for nothing at all', () => {
    expect(sharedProjectId([])).toBeNull();
  });
});
