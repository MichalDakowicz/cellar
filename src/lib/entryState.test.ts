import { isDimmed, isLive, stateMeta } from '@/lib/entryState';

describe('stateMeta', () => {
  it('falls back to open for anything it does not know', () => {
    expect(stateMeta('nonsense').value).toBe('open');
    expect(stateMeta(null).value).toBe('open');
  });
});

describe('isDimmed', () => {
  it('leaves live work at full strength', () => {
    expect(isDimmed({ state: 'open', archived: false })).toBe(false);
    expect(isDimmed({ state: 'doing', archived: false })).toBe(false);
    expect(isDimmed({ state: 'blocked', archived: false })).toBe(false);
  });

  it('dims what has settled either way', () => {
    expect(isDimmed({ state: 'done', archived: false })).toBe(true);
    expect(isDimmed({ state: 'dropped', archived: false })).toBe(true);
  });

  // The archive is a band under the states, not a state, so an archived thought
  // keeps whatever state it had — usually open.
  it('dims an archived thought whatever state it is in', () => {
    expect(isDimmed({ state: 'open', archived: true })).toBe(true);
    expect(isDimmed({ state: 'doing', archived: true })).toBe(true);
    expect(isDimmed({ state: 'blocked', archived: true })).toBe(true);
  });
});

describe('isLive', () => {
  it('counts the three unsettled states', () => {
    expect(isLive('open')).toBe(true);
    expect(isLive('done')).toBe(false);
  });
});
