import { deskSections, LATELY_MAX, runChip } from './deskView';

const run = (state: 'running' | 'waiting' | 'done' | 'failed' | 'stopped', startedAt: number) => ({ state, startedAt });

describe('runChip', () => {
  it('calls a running run doing and a waiting one waiting', () => {
    expect(runChip('running').label).toBe('doing');
    expect(runChip('waiting').label).toBe('waiting');
  });

  it('tints every chip with an rgba, never a concatenated hex', () => {
    for (const state of ['running', 'waiting', 'done', 'failed', 'stopped'] as const) {
      expect(runChip(state).tint).toMatch(/^rgba\(/);
    }
  });
});

describe('deskSections', () => {
  it('puts waiting first, then running, then what finished', () => {
    const sections = deskSections([run('done', 1), run('running', 2), run('waiting', 3), run('failed', 4)]);
    expect(sections.waiting.map((r) => r.startedAt)).toEqual([3]);
    expect(sections.running.map((r) => r.startedAt)).toEqual([2]);
    expect(sections.lately.map((r) => r.startedAt)).toEqual([4, 1]);
  });

  it('keeps only the newest few finished runs', () => {
    const done = Array.from({ length: LATELY_MAX + 3 }, (_, i) => run('done', i));
    const { lately } = deskSections(done);
    expect(lately).toHaveLength(LATELY_MAX);
    expect(lately[0].startedAt).toBe(LATELY_MAX + 2);
  });
});
