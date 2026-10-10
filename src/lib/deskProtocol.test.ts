import { isDeskSeen, isStaleRequest, parseDeskStart, runTitle, sortRuns, STALE_REQUEST_MS } from '@/lib/deskProtocol';

const NOW = Date.parse('2026-10-09T12:00:00.000Z');

describe('parseDeskStart', () => {
  it('preserves every task choice and rejects malformed attachments', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    const body = { commandId: id, projectId: id, where: 'main', mode: 'ask', agent: 'codex', prompt: 'check', cwd: 'C:/project', entryIds: [id] };
    expect(parseDeskStart(body)).toMatchObject({ ok: true, value: { ...body, entryId: id } });
    for (const over of [{ commandId: 'bad' }, { projectId: null }, { mode: 'auto' }, { where: 'elsewhere' }, { entryIds: [id, id] }, { entryIds: ['bad'] }]) {
      expect(parseDeskStart({ ...body, ...over })).toMatchObject({ ok: false });
    }
  });
  it('defaults the agent to claude and trims what it keeps', () => {
    expect(parseDeskStart({ prompt: '  pick up cellar entry 0afbf3fe ', cwd: ' C:\\ping\\cellar ' })).toEqual({
      ok: true,
      value: { agent: 'claude', prompt: 'pick up cellar entry 0afbf3fe', cwd: 'C:\\ping\\cellar', name: null, entryId: null },
    });
  });

  it('refuses an unknown agent, an empty prompt and a missing folder', () => {
    expect(parseDeskStart({ agent: 'rm', prompt: 'x', cwd: 'C:\\x' })).toMatchObject({ ok: false });
    expect(parseDeskStart({ prompt: '   ', cwd: 'C:\\x' })).toMatchObject({ ok: false });
    expect(parseDeskStart({ prompt: 'x' })).toMatchObject({ ok: false });
    expect(parseDeskStart(null)).toMatchObject({ ok: false });
  });

  it('drops an entry id that is not a uuid instead of passing it on', () => {
    const parsed = parseDeskStart({ agent: 'codex', prompt: 'x', cwd: 'C:\\x', entryId: "1'; drop" });
    expect(parsed).toMatchObject({ ok: true, value: { agent: 'codex', entryId: null } });
  });
});

describe('runTitle', () => {
  it('uses the name when there is one, else the first line cut short', () => {
    expect(runTitle({ name: 'named', prompt: 'x' })).toBe('named');
    expect(runTitle({ name: null, prompt: 'first line\nsecond' })).toBe('first line');
    expect(runTitle({ name: null, prompt: 'y'.repeat(100) })).toHaveLength(60);
  });
});

describe('sortRuns', () => {
  it('puts live runs first, newest first inside each', () => {
    const runs = [
      { id: 'a', state: 'done' as const, startedAt: 3 },
      { id: 'b', state: 'running' as const, startedAt: 1 },
      { id: 'c', state: 'waiting' as const, startedAt: 2 },
      { id: 'd', state: 'failed' as const, startedAt: 4 },
    ];
    expect(sortRuns(runs).map((run) => run.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

describe('isStaleRequest / isDeskSeen', () => {
  it('treats an old or unreadable request as stale', () => {
    expect(isStaleRequest(new Date(NOW - 1000).toISOString(), NOW)).toBe(false);
    expect(isStaleRequest(new Date(NOW - STALE_REQUEST_MS - 1).toISOString(), NOW)).toBe(true);
    expect(isStaleRequest('soon', NOW)).toBe(true);
  });

  it('counts a heartbeat for ninety seconds', () => {
    expect(isDeskSeen(new Date(NOW - 60_000).toISOString(), NOW)).toBe(true);
    expect(isDeskSeen(new Date(NOW - 120_000).toISOString(), NOW)).toBe(false);
    expect(isDeskSeen(null, NOW)).toBe(false);
  });
});
