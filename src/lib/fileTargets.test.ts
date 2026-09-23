import { fanOut, INBOX_TARGET, liveTargets, pickTarget, targetLabel, toggleTarget } from '@/lib/fileTargets';

describe('pickTarget', () => {
  it('is one project, never a toggle', () => {
    expect(pickTarget('p1')).toEqual(['p1']);
  });

  it('is the empty set for the inbox', () => {
    expect(pickTarget(INBOX_TARGET)).toEqual([]);
  });
});

describe('toggleTarget', () => {
  it('adds a held project to the set', () => {
    expect(toggleTarget(['p1'], 'p2')).toEqual(['p1', 'p2']);
  });

  it('takes a held project back out', () => {
    expect(toggleTarget(['p1', 'p2'], 'p1')).toEqual(['p2']);
  });

  it('clears the set when the inbox is held — unfiled is no project at all', () => {
    expect(toggleTarget(['p1', 'p2'], INBOX_TARGET)).toEqual([]);
  });
});

describe('liveTargets', () => {
  it('drops a remembered project that is not on this shelf', () => {
    expect(liveTargets(['p1', 'x9'], ['p1', 'p2'])).toEqual(['p1']);
  });

  it('falls back to the inbox when nothing remembered is here', () => {
    expect(liveTargets(['x9'], ['p1'])).toEqual([]);
  });
});

describe('targetLabel', () => {
  it('names the inbox, one project, two, and then counts', () => {
    expect(targetLabel([])).toBe('inbox');
    expect(targetLabel(['cellar'])).toBe('cellar');
    expect(targetLabel(['cellar', 'radar'])).toBe('cellar and radar');
    expect(targetLabel(['cellar', 'radar', 'lidar'])).toBe('3 projects');
  });
});

describe('fanOut', () => {
  const drops = [{ text: 'a' }, { text: 'b' }];

  it('files every drop into every target', () => {
    expect(fanOut(drops, ['p1', 'p2'])).toEqual([
      { text: 'a', projectId: 'p1' },
      { text: 'b', projectId: 'p1' },
      { text: 'a', projectId: 'p2' },
      { text: 'b', projectId: 'p2' },
    ]);
  });

  it('writes the inbox as a null project, once per drop', () => {
    expect(fanOut(drops, [])).toEqual([
      { text: 'a', projectId: null },
      { text: 'b', projectId: null },
    ]);
  });
});
