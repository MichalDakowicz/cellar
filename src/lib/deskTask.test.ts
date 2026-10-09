import { DEFAULT_MODE, DESK_MODES, modeHint, taskBlocker, taskPrompt, taskStarts } from './deskTask';

describe('taskPrompt', () => {
  it('puts the attached thoughts before what you said', () => {
    expect(taskPrompt('  keep the undo toast ', ['pick up cellar entry 4f2a9c33'])).toBe(
      'pick up cellar entry 4f2a9c33\n\nkeep the undo toast',
    );
  });

  it('is either half alone when the other is empty', () => {
    expect(taskPrompt('just this', [])).toBe('just this');
    expect(taskPrompt('', ['pick up a', ' '])).toBe('pick up a');
    expect(taskPrompt(' ', [])).toBe('');
  });
});

describe('taskBlocker', () => {
  const ready = { prompt: 'do it', hasFolder: true, canStart: true, host: 'pc', busy: false };

  it('is null when it can be sent', () => {
    expect(taskBlocker(ready)).toBeNull();
  });

  it('asks for words first, then a project, then the pc', () => {
    expect(taskBlocker({ ...ready, prompt: '', hasFolder: false, canStart: false })).toBe('say what it should do');
    expect(taskBlocker({ ...ready, hasFolder: false, canStart: false })).toBe('pick the project it works in');
    expect(taskBlocker({ ...ready, canStart: false })).toBe('pc is off, asleep or away');
    expect(taskBlocker({ ...ready, busy: true })).toBe('asking pc…');
  });
});

describe('modes', () => {
  it('defaults to edits ok and has a hint for every mode', () => {
    expect(DEFAULT_MODE).toBe('edits');
    for (const mode of DESK_MODES) expect(modeHint(mode.id)).toBe(mode.hint);
  });
});

describe('taskStarts', () => {
  const picks = [
    { entryId: 'a', line: 'pick up a' },
    { entryId: 'b', line: 'pick up b' },
  ];

  it('is one unbound run with no thoughts', () => {
    expect(taskStarts({ typed: 'do it', picks: [], together: '', split: 'each' })).toEqual([{ prompt: 'do it', entryId: null }]);
  });

  it('binds a single thought, whatever the split', () => {
    expect(taskStarts({ typed: 'go', picks: picks.slice(0, 1), together: 'both', split: 'one' })).toEqual([
      { prompt: 'pick up a\n\ngo', entryId: 'a' },
    ]);
  });

  it('picks several up in one run, bound to the first', () => {
    expect(taskStarts({ typed: 'go', picks, together: 'pick up a b', split: 'one' })).toEqual([
      { prompt: 'pick up a b\n\ngo', entryId: 'a' },
    ]);
  });

  it('starts one run each', () => {
    expect(taskStarts({ typed: 'go', picks, together: 'pick up a b', split: 'each' })).toEqual([
      { prompt: 'pick up a\n\ngo', entryId: 'a' },
      { prompt: 'pick up b\n\ngo', entryId: 'b' },
    ]);
  });
});
