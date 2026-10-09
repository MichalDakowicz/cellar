import { DEFAULT_MODE, DESK_MODES, modeHint, taskBlocker, taskPrompt } from './deskTask';

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
