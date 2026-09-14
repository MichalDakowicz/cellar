import { agentPrompt, SHORT_ID, shortEntryId } from '@/lib/agentPrompt';

const entry = { id: '4a4986e4-bbc1-4e71-a41e-9e7772745a00', text: 'the nav island jumps on keyboard open' };

describe('shortEntryId', () => {
  it('is the prefix the server resolves by', () => {
    expect(shortEntryId(entry.id)).toBe('4a4986e4');
    expect(shortEntryId(entry.id)).toHaveLength(SHORT_ID);
  });
});

describe('agentPrompt', () => {
  it('names the entry, the project and the thought', () => {
    expect(agentPrompt(entry, 'cellar')).toBe(
      'pick up cellar entry 4a4986e4 in cellar — the nav island jumps on keyboard open',
    );
  });

  // An inbox thought has no project, and "in null" would be worse than nothing.
  it('leaves the project out when there is not one', () => {
    expect(agentPrompt(entry, null)).toBe('pick up cellar entry 4a4986e4 — the nav island jumps on keyboard open');
    expect(agentPrompt(entry)).toBe('pick up cellar entry 4a4986e4 — the nav island jumps on keyboard open');
  });

  it('keeps the thought verbatim — it is what makes the paste readable later', () => {
    expect(agentPrompt({ id: entry.id, text: 'a — b, c' }, 'cellar')).toContain('a — b, c');
  });
});
