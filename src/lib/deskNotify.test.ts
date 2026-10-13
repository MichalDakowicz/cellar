import { approvalNote, capActions, NOTE_ACTIONS_MAX, questionNote, runNote } from './deskNotify';

describe('capActions', () => {
  it('keeps three or fewer as they are', () => {
    const three = [1, 2, 3].map((n) => ({ id: `${n}`, label: `${n}` }));
    expect(capActions(three)).toEqual(three);
  });

  it('folds the rest into more…', () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({ id: `${n}`, label: `${n}` }));
    const capped = capActions(five);
    expect(capped).toHaveLength(NOTE_ACTIONS_MAX);
    expect(capped.map((action) => action.id)).toEqual(['1', '2', 'more']);
  });
});

describe('runNote', () => {
  it('names the step of the plan and how far along it is', () => {
    const note = runNote({ id: 'r', title: 'fix the cart', host: 'pc', doing: 'running the tests', plan: { at: 3, of: 5 }, stoppable: true });
    expect(note.title).toBe('fix the cart · plan 3 of 5');
    expect(note.progress).toBe(0.6);
    expect(note.actions.map((action) => action.id)).toEqual(['stop', 'open']);
  });

  it('has no bar without a plan, and no stop on a run that is not ours', () => {
    const note = runNote({ id: 'r', title: 'x', host: 'pc', doing: null, plan: null, stoppable: false });
    expect(note.progress).toBeNull();
    expect(note.body).toEqual([]);
    expect(note.actions.map((action) => action.id)).toEqual(['open']);
  });
});

describe('approvalNote', () => {
  it('fits deny, allow for this run and allow', () => {
    const note = approvalNote({ id: 'a', agent: 'codex', what: 'run a command', subject: 'npm i date-fns', where: 'web-shop' });
    expect(note.title).toBe('codex wants to run a command');
    expect(note.mono).toBe(true);
    expect(note.actions.map((action) => action.label)).toEqual(['deny', 'allow for this run', 'allow']);
  });
});

describe('questionNote', () => {
  it('offers two options and more when there are more', () => {
    const note = questionNote({ id: 'q', agent: 'claude', where: 'shop', question: 'how?', options: ['bottom', 'right', 'top', 'none'] });
    expect(note.body).toEqual(['A  bottom', 'B  right', '+2 more · or reply in your own words']);
    expect(note.actions.map((action) => action.label)).toEqual(['A', 'B', 'more…']);
  });

  it('has no more with two or fewer', () => {
    const note = questionNote({ id: 'q', agent: null, where: 'inbox', question: 'which?', options: ['x', 'y'] });
    expect(note.head).toBe('cellar · an agent asks · inbox');
    expect(note.actions.map((action) => action.label)).toEqual(['A', 'B']);
  });

  it('is a reply with no options at all', () => {
    const note = questionNote({ id: 'q', agent: 'claude', where: 'shop', question: 'why?', options: [] });
    expect(note.body).toEqual(['reply in your own words']);
    expect(note.actions.map((action) => action.id)).toEqual(['more']);
  });
});
