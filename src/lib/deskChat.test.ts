import { chatItems, toolsSummary } from './deskChat';

describe('chatItems', () => {
  it('folds a stretch of tool steps into one tile', () => {
    const items = chatItems([
      { who: 'you', text: 'fix it' },
      { who: 'agent', text: 'on it' },
      { who: 'tool', text: 'Read a.ts' },
      { who: 'tool', text: 'Read b.ts' },
      { who: 'agent', text: 'done' },
      { who: 'tool', text: 'Bash npm test' },
    ]);
    expect(items.map((item) => item.kind)).toEqual(['you', 'agent', 'tools', 'agent', 'tools']);
    expect(items[2]).toEqual({ kind: 'tools', steps: ['Read a.ts', 'Read b.ts'] });
  });

  it('drops empty lines and keeps system lines as notes', () => {
    expect(chatItems([{ who: 'agent', text: '  ' }, { who: 'system', text: 'stopped' }])).toEqual([
      { kind: 'note', text: 'stopped' },
    ]);
  });
});

describe('toolsSummary', () => {
  it('says read n files when every step is a read', () => {
    expect(toolsSummary(['Read a', 'read b'])).toBe('read 2 files');
    expect(toolsSummary(['Read a'])).toBe('read 1 file');
  });

  it('counts steps otherwise', () => {
    expect(toolsSummary(['Read a', 'Bash npm test', 'Edit b'])).toBe('3 steps');
  });
});
