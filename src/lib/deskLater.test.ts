import { groupLine, guessKind, nightLine, raceRows } from './deskLater';

describe('guessKind', () => {
  it('hears something broken as a glitch', () => {
    expect(guessKind('checkout button does nothing on the second tap — nothing happens')).toBe('glitch');
    expect(guessKind('app crashed on launch')).toBe('glitch');
  });

  it('hears a question', () => {
    expect(guessKind('should the cart open from the bottom?')).toBe('question');
  });

  it('takes a link as research', () => {
    expect(guessKind('read this https://example.com/article')).toBe('research');
  });

  it('calls the rest an idea', () => {
    expect(guessKind('a dark map style for night')).toBe('idea');
  });
});

describe('raceRows', () => {
  it('lines the runs up measure by measure', () => {
    const rows = raceRows([
      { agent: 'a', checks: 'ok', added: 1, removed: 2, files: 3, took: '1m', usage: '1k', approach: 'x' },
      { agent: 'b', checks: 'no', added: 4, removed: 5, files: 6, took: '2m', usage: '2k', approach: 'y' },
    ]);
    expect(rows.map((row) => row.label)).toEqual(['checks', 'changed', 'took', 'usage', 'approach']);
    expect(rows[1].values).toEqual(['+1 −2 · 3 files', '+4 −5 · 6 files']);
  });
});

describe('nightLine', () => {
  it('counts what needs you and what failed', () => {
    expect(nightLine([{ state: 'passed' }, { state: 'waiting' }, { state: 'failed' }, { state: 'passed' }])).toBe(
      '4 runs · 1 needs you · 1 failed',
    );
  });

  it('says only the count on a quiet night', () => {
    expect(nightLine([{ state: 'passed' }])).toBe('1 run');
  });
});

describe('groupLine', () => {
  it('counts each state in words, leaving out the empty ones', () => {
    expect(groupLine([{ state: 'done' }, { state: 'done' }, { state: 'waiting' }])).toBe('2 done · 1 waiting on you');
  });
});
