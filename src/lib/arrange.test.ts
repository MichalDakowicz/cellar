import { byPosition, moveIndex, positionWrites } from '@/lib/arrange';

describe('moveIndex', () => {
  it('moves one item down and one up', () => {
    expect(moveIndex(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveIndex(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('clamps a target past either end, and ignores a source that is not there', () => {
    expect(moveIndex(['a', 'b'], 0, 9)).toEqual(['b', 'a']);
    expect(moveIndex(['a', 'b'], 5, 0)).toEqual(['a', 'b']);
  });

  it('leaves the list it was handed alone', () => {
    const list = ['a', 'b'];
    moveIndex(list, 0, 1);
    expect(list).toEqual(['a', 'b']);
  });
});

describe('positionWrites', () => {
  it('numbers the whole list from one the first time, when everything sits at 0', () => {
    const before = [
      { id: 'a', position: 0 },
      { id: 'b', position: 0 },
    ];
    expect(positionWrites(before, ['b', 'a'])).toEqual([
      { id: 'b', position: 1 },
      { id: 'a', position: 2 },
    ]);
  });

  it('writes only the rows whose number moved', () => {
    const before = [
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
      { id: 'd', position: 4 },
    ];
    expect(positionWrites(before, ['a', 'c', 'b', 'd'])).toEqual([
      { id: 'c', position: 2 },
      { id: 'b', position: 3 },
    ]);
  });
});

describe('byPosition', () => {
  it('reads placed rows in their order, with never-placed ones first, newest first', () => {
    const rows = [
      { id: 'placed-2', position: 2, createdAt: '2026-09-01' },
      { id: 'new-old', position: 0, createdAt: '2026-09-10' },
      { id: 'placed-1', position: 1, createdAt: '2026-09-02' },
      { id: 'new-new', position: 0, createdAt: '2026-09-20' },
    ];
    expect(byPosition(rows).map((row) => row.id)).toEqual(['new-new', 'new-old', 'placed-1', 'placed-2']);
  });

  it('treats a missing position as never placed', () => {
    expect(byPosition([{ createdAt: '2026-09-01', position: 1 }, { createdAt: '2026-09-02' }])[0].createdAt).toBe('2026-09-02');
  });
});
