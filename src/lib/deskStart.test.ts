import { deskStartFrom, offeredAgents } from '@/lib/deskStart';

describe('deskStartFrom', () => {
  it('runs the prompt in the project folder', () => {
    expect(
      deskStartFrom({ prompt: 'pick up cellar entry 0afbf3fe', repoPath: ' C:\\ping\\cellar\\ ', entryId: 'e', agent: 'codex' }),
    ).toEqual({
      ok: true,
      start: { agent: 'codex', prompt: 'pick up cellar entry 0afbf3fe', cwd: 'C:\\ping\\cellar', name: null, entryId: 'e' },
    });
  });

  it('refuses a project with nowhere to run', () => {
    expect(deskStartFrom({ prompt: 'x', repoPath: null, agent: 'claude' })).toMatchObject({ ok: false });
    expect(deskStartFrom({ prompt: 'x', repoPath: '  ', agent: 'claude' })).toMatchObject({ ok: false });
  });
});

describe('offeredAgents', () => {
  it('offers what the pc has, in a fixed order', () => {
    expect(offeredAgents(['agy', 'claude'])).toEqual(['claude', 'agy']);
  });

  it('offers everything when the pc has not said', () => {
    expect(offeredAgents(null)).toEqual(['claude', 'codex', 'agy']);
    expect(offeredAgents([])).toEqual(['claude', 'codex', 'agy']);
  });
});
