import { nudgeDaysOf, nudgesDue, nudgesPerDayOf, staleThoughts, type NudgeCandidate } from '@/lib/nudges';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-23T12:00:00.000Z');
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

const thought = (id: string, over: Partial<NudgeCandidate> = {}): NudgeCandidate => ({
  id,
  text: `thought ${id}`,
  kind: 'glitch',
  projectId: 'p1',
  createdAt: ago(10),
  updatedAt: null,
  ...over,
});

const nameOf = (id: string | null) => (id === 'p1' ? 'cellar' : 'inbox');
const run = (stale: NudgeCandidate[], ledger = [] as { key: string; at: number }[], perDay = 1) =>
  nudgesDue(stale, ledger, { now: NOW, days: 7, perDay, nameOf });

describe('readers', () => {
  it('take the offered values and fall back to a week and one a day', () => {
    expect(nudgeDaysOf(14)).toBe(14);
    expect(nudgeDaysOf(9)).toBe(7);
    expect(nudgesPerDayOf(3)).toBe(3);
    expect(nudgesPerDayOf(0)).toBe(1);
  });
});

describe('staleThoughts', () => {
  it('keeps only what nobody has touched past the threshold', () => {
    const fresh = thought('a', { createdAt: ago(2) });
    const edited = thought('b', { createdAt: ago(20), updatedAt: ago(1) });
    const old = thought('c', { createdAt: ago(20) });
    expect(staleThoughts([fresh, edited, old], NOW, 7).map((t) => t.id)).toEqual(['c']);
  });

  it('puts unfiled ideas first, then unfiled, then ideas, then the rest, oldest first inside each', () => {
    const list = [
      thought('rest', { createdAt: ago(30) }),
      thought('idea', { kind: 'idea', createdAt: ago(9) }),
      thought('unfiled', { projectId: null, createdAt: ago(9) }),
      thought('inbox-idea-new', { kind: 'idea', projectId: null, createdAt: ago(8) }),
      thought('inbox-idea-old', { kind: 'idea', projectId: null, createdAt: ago(20) }),
    ];
    expect(staleThoughts(list, NOW, 7).map((t) => t.id)).toEqual([
      'inbox-idea-old',
      'inbox-idea-new',
      'unfiled',
      'idea',
      'rest',
    ]);
  });
});

describe('nudgesDue', () => {
  it('sends one banner per thought while the day allows it', () => {
    const { nudges } = run([thought('a'), thought('b')], [], 2);
    expect(nudges.map((n) => n.route)).toEqual(['/entry/a', '/entry/b']);
    expect(nudges[0].title).toBe('cellar · untouched 10d');
  });

  it('groups them into one banner when there are more than the allowance', () => {
    const { nudges } = run([thought('a'), thought('b'), thought('c')], [], 2);
    expect(nudges).toHaveLength(1);
    expect(nudges[0].title).toBe('3 thoughts untouched for 7d or more');
    expect(nudges[0].covers).toEqual(['a', 'b', 'c']);
    expect(nudges[0].route).toBe('/shelf');
  });

  it('sends a group of unfiled thoughts to the inbox', () => {
    const { nudges } = run([thought('a', { projectId: null }), thought('b', { projectId: null })]);
    expect(nudges[0].route).toBe('/inbox');
  });

  it('names an unfiled thought as still in the inbox', () => {
    expect(run([thought('a', { projectId: null })]).nudges[0].title).toBe('still in the inbox · untouched 10d');
  });

  it('stops once the day is spent, and counts a grouped banner as one', () => {
    const first = run([thought('a'), thought('b')]);
    expect(first.nudges).toHaveLength(1);
    expect(run([thought('c')], first.ledger).nudges).toEqual([]);
  });

  it('does not nudge the same thought again inside its threshold', () => {
    const first = run([thought('a')]);
    const tomorrow = nudgesDue([thought('a')], first.ledger, { now: NOW + DAY + 1, days: 7, perDay: 1, nameOf });
    expect(tomorrow.nudges).toEqual([]);
  });

  it('nudges it again once the threshold has passed since the last one', () => {
    const first = run([thought('a')]);
    const nextWeek = nudgesDue([thought('a')], first.ledger, { now: NOW + 8 * DAY, days: 7, perDay: 1, nameOf });
    expect(nextWeek.nudges).toHaveLength(1);
  });

  it('says nothing when nothing is stale', () => {
    expect(run([])).toEqual({ nudges: [], ledger: [] });
  });
});
