import { AGENT_LINE_MAX, agentLine, askRule, canClaim, inProgress, kindWork, splitThread, waitingOnYou } from '@/lib/agentWork';
import { KINDS } from '@/lib/kinds';

const entry = (over: Partial<Parameters<typeof canClaim>[0]> & Record<string, unknown> = {}) => ({
  state: 'open' as const,
  archived: false,
  agent: null,
  createdAt: '2026-09-14T10:00:00Z',
  ...over,
});

describe('canClaim', () => {
  it('takes an untouched thought', () => {
    expect(canClaim(entry())).toBe(true);
  });

  it('leaves anything already moved alone', () => {
    expect(canClaim(entry({ state: 'doing' }))).toBe(false);
    expect(canClaim(entry({ state: 'blocked' }))).toBe(false);
    expect(canClaim(entry({ state: 'done' }))).toBe(false);
  });

  it('leaves an archived thought alone — it was put away on purpose', () => {
    expect(canClaim(entry({ archived: true }))).toBe(false);
  });
});

describe('waitingOnYou', () => {
  it('is the blocked ones, newest first', () => {
    const list = [
      entry({ state: 'blocked', createdAt: '2026-09-12T10:00:00Z' }),
      entry({ state: 'doing' }),
      entry({ state: 'blocked', createdAt: '2026-09-14T10:00:00Z' }),
    ];
    expect(waitingOnYou(list).map((e) => e.createdAt)).toEqual([
      '2026-09-14T10:00:00Z',
      '2026-09-12T10:00:00Z',
    ]);
  });

  it('skips an archived question', () => {
    expect(waitingOnYou([entry({ state: 'blocked', archived: true })])).toEqual([]);
  });
});

describe('inProgress', () => {
  it('is only what an agent actually named itself on', () => {
    const list = [entry({ state: 'doing', agent: 'claude' }), entry({ state: 'doing', agent: null })];
    expect(inProgress(list)).toHaveLength(1);
  });
});

describe('splitThread', () => {
  it('cuts a thread into your lines and the reports against them', () => {
    const lines = [
      { id: '1', source: 'user' as const },
      { id: '2', source: 'agent' as const },
      { id: '3', source: 'user' as const },
    ];
    const { yours, agent } = splitThread(lines);
    expect(yours.map((l) => l.id)).toEqual(['1', '3']);
    expect(agent.map((l) => l.id)).toEqual(['2']);
  });

  // Lines written before the column existed have no source and are the user's.
  it('treats an unknown source as yours', () => {
    const { yours } = splitThread([{ id: '1', source: undefined as unknown as 'user' }]);
    expect(yours).toHaveLength(1);
  });
});

describe('agentLine', () => {
  it('collapses a paragraph to one line, like the capture field does', () => {
    expect(agentLine('fixed it\n  in useDumpScreen')).toBe('fixed it in useDumpScreen');
  });

  it('cuts an essay off rather than letting a row grow', () => {
    const line = agentLine('x'.repeat(400));
    expect(line).toHaveLength(AGENT_LINE_MAX);
    expect(line.endsWith('…')).toBe(true);
  });
});

describe('kindWork', () => {
  it('covers every kind the app can store', () => {
    for (const kind of KINDS) expect(kindWork(kind.value).kind).toBe(kind.value);
  });

  it('makes the two destructive-or-underspecified kinds always ask', () => {
    expect(kindWork('idea').ask).toBe('always');
    expect(kindWork('removal').ask).toBe('always');
  });

  it('falls back rather than throwing on a kind this build does not know', () => {
    expect(kindWork('nonsense' as never).kind).toBe('idea');
  });
});

describe('askRule', () => {
  it('tells an idea to stop before building', () => {
    expect(askRule('idea')).toContain('ask before you act');
  });

  it('tells a glitch to ask only when two readings would differ', () => {
    expect(askRule('glitch')).toContain('two readings');
  });
});
