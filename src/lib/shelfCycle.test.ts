import {
  claimsHorizontalPan,
  cycleShelf,
  SWIPE_CLAIM_DISTANCE,
  SWIPE_MIN_DISTANCE,
  swipeDirection,
} from '@/lib/shelfCycle';

const shelves = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

describe('claimsHorizontalPan', () => {
  it('leaves a tap alone', () => {
    expect(claimsHorizontalPan(0, 0)).toBe(false);
    expect(claimsHorizontalPan(SWIPE_CLAIM_DISTANCE, 0)).toBe(false);
  });

  it('leaves a scroll alone', () => {
    expect(claimsHorizontalPan(20, 60)).toBe(false);
  });

  it('claims a flat drag in either direction', () => {
    expect(claimsHorizontalPan(20, 5)).toBe(true);
    expect(claimsHorizontalPan(-20, 5)).toBe(true);
  });
});

describe('swipeDirection', () => {
  it('ignores a drag that never went anywhere', () => {
    expect(swipeDirection(SWIPE_MIN_DISTANCE - 1, 0)).toBeNull();
  });

  it('reads left as next and right as previous', () => {
    expect(swipeDirection(-80, 0)).toBe('next');
    expect(swipeDirection(80, 0)).toBe('previous');
  });

  it('forgives a drag that curls, and refuses one that is mostly vertical', () => {
    expect(swipeDirection(80, 50)).toBe('previous');
    expect(swipeDirection(80, 90)).toBeNull();
  });
});

describe('cycleShelf', () => {
  it('steps forward and back', () => {
    expect(cycleShelf(shelves, 'a', 'next')).toBe('b');
    expect(cycleShelf(shelves, 'b', 'previous')).toBe('a');
  });

  it('wraps at both ends', () => {
    expect(cycleShelf(shelves, 'c', 'next')).toBe('a');
    expect(cycleShelf(shelves, 'a', 'previous')).toBe('c');
  });

  it('has nowhere to go with one shelf or none', () => {
    expect(cycleShelf([{ id: 'a' }], 'a', 'next')).toBeNull();
    expect(cycleShelf([], null, 'next')).toBeNull();
  });

  it('treats an unset or unknown shelf as the first, the way the pill does', () => {
    expect(cycleShelf(shelves, null, 'next')).toBe('b');
    expect(cycleShelf(shelves, 'gone', 'next')).toBe('b');
    expect(cycleShelf(shelves, null, 'previous')).toBe('c');
  });
});
