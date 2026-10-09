import { deskSections, deskSummary, hostLine, LATELY_MAX, runChip, runMeta } from './deskView';

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

describe('deskSummary', () => {
  it('names the host and only counts what is there', () => {
    expect(deskSummary({ name: 'pc', online: true, running: 0, waiting: 0 })).toBe('pc is awake');
    expect(deskSummary({ name: 'pc', online: true, running: 2, waiting: 1 })).toBe(
      'pc is awake · 2 agents at work · 1 waiting on you',
    );
    expect(deskSummary({ name: 'pc', online: false, running: 1, waiting: 0 })).toBe(
      'pc is not answering · 1 agent at work',
    );
  });
});

describe('runMeta', () => {
  it('drops the parts that are not known', () => {
    expect(runMeta(['cellar', null, 'claude', '', '6m'])).toBe('cellar · claude · 6m');
  });
});

describe('hostLine', () => {
  it('is offline only when nothing reaches the pc', () => {
    expect(hostLine('lan', false).online).toBe(true);
    expect(hostLine('cellar', false).online).toBe(true);
    expect(hostLine('none', true)).toEqual({ online: false, line: 'looking for it…' });
  });
});
