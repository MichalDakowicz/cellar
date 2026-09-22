import {
  agentPrompt,
  bareProjectId,
  projectPrompt,
  PROJECT_PREFIX,
  SHORT_ID,
  shortEntryId,
  shortProjectId,
} from '@/lib/agentPrompt';

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

const project = { id: '9b1cde07-2f44-4d3a-9c21-0e7a51b6d004', name: 'cellar' };

describe('shortProjectId', () => {
  it('is the same slice as an entry, wearing the prefix', () => {
    expect(shortProjectId(project.id)).toBe('p-9b1cde07');
    expect(shortProjectId(project.id)).toHaveLength(SHORT_ID + PROJECT_PREFIX.length);
  });

  // The whole point: the two can sit in one pasted line and stay apart.
  it('cannot be read as an entry id', () => {
    expect(shortProjectId(project.id)).not.toBe(shortEntryId(project.id));
  });
});

describe('bareProjectId', () => {
  it('takes the prefix back off for the side that resolves it', () => {
    expect(bareProjectId('p-9b1cde07')).toBe('9b1cde07');
    expect(bareProjectId('  P-9b1cde07 ')).toBe('9b1cde07');
  });

  it('leaves an unprefixed ref alone', () => {
    expect(bareProjectId('9b1cde07')).toBe('9b1cde07');
    expect(bareProjectId('pulsar')).toBe('pulsar');
  });

  // The prefix alone resolves to nothing, and the caller checks for that rather
  // than matching every project on an empty prefix.
  it('is empty when the prefix is all there was', () => {
    expect(bareProjectId('p-')).toBe('');
  });
});

describe('projectPrompt', () => {
  it('uses the same verb as an entry, and says which it is', () => {
    expect(projectPrompt(project)).toBe('pick up cellar project p-9b1cde07 — cellar');
  });
});
