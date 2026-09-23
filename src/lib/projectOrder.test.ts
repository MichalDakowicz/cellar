import { pinnedFirst } from '@/lib/projectOrder';

const p = (name: string, pinned = false) => ({ name, pinned });

describe('pinnedFirst', () => {
  it('lifts pinned projects to the top', () => {
    expect(pinnedFirst([p('a'), p('b', true), p('c')]).map((x) => x.name)).toEqual(['b', 'a', 'c']);
  });

  it('keeps pinned projects in the order they came in', () => {
    expect(pinnedFirst([p('a', true), p('b'), p('c', true)]).map((x) => x.name)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the unpinned exactly where they were', () => {
    const list = [p('c'), p('a'), p('b')];
    expect(pinnedFirst(list).map((x) => x.name)).toEqual(['c', 'a', 'b']);
  });

  it('does not touch the list it was handed', () => {
    const list = [p('a'), p('b', true)];
    pinnedFirst(list);
    expect(list.map((x) => x.name)).toEqual(['a', 'b']);
  });
});
