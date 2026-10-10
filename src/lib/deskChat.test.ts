import { chatItems, stepRows, toolsSummary } from './deskChat';

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

describe('stepRows', () => {
  it('folds reads and edits, and gives each command its own row', () => {
    const rows = stepRows(['Read a.tsx', 'Read b.tsx', 'Bash rg -n "profile" src', 'Edit a.tsx', 'Edit b.tsx']);
    expect(rows.map((row) => [row.kind, row.label, row.mono])).toEqual([
      ['read', 'read 2 files', false],
      ['command', 'rg -n "profile" src', true],
      ['edit', 'edited 2 files', false],
    ]);
    expect(rows[0].steps).toEqual(['Read a.tsx', 'Read b.tsx']);
  });

  it('drops the dash a log puts between the tool and its words', () => {
    expect(stepRows(['Bash — list the files'])[0].label).toBe('list the files');
  });

  it('keeps an unknown step as it is', () => {
    expect(stepRows(['WebSearch cats'])).toEqual([{ kind: 'other', label: 'WebSearch cats', mono: false, steps: ['WebSearch cats'] }]);
  });

  it('says one file when there is one', () => {
    expect(stepRows(['Read only.tsx'])[0].label).toBe('read 1 file');
  });
});
