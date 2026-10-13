import { applySuggestion, keyPlan, keySlug, keySuggestions, tokenAt, type KeySources } from './deskKeys';

const sources: KeySources = {
  projects: [
    { id: 'p1', name: 'Cellar' },
    { id: 'p2', name: 'web shop' },
  ],
  entries: [
    { id: 'e1', projectId: 'p1', text: 'inbox swipe feels sticky on android', kind: 'glitch', state: 'open', archived: false },
    { id: 'e2', projectId: 'p1', text: 'streak pill clips', kind: 'glitch', state: 'doing', archived: false },
    { id: 'e3', projectId: 'p1', text: 'sticky old thing', kind: 'idea', state: 'done', archived: false },
    { id: 'e4', projectId: 'p2', text: 'sticky header', kind: 'idea', state: 'open', archived: false },
  ],
  commands: ['rebuild', 'preview', 'deploy', 'apk'],
  files: [
    { path: 'src/app.json', changed: false },
    { path: 'src/NavIslands.tsx', changed: true },
  ],
  skills: [
    { name: 'review', detail: 'built in' },
    { name: 'frontend-design', detail: 'yours' },
  ],
};

describe('keySlug', () => {
  it('lowercases words and joins them with dashes', () => {
    expect(keySlug('Inbox swipe — feels STICKY!')).toBe('inbox-swipe-feels-sticky');
  });

  it('keeps the first few words', () => {
    expect(keySlug('a b c d e f g h')).toBe('a-b-c-d-e-f');
  });
});

describe('tokenAt', () => {
  it('finds the key word at the caret', () => {
    expect(tokenAt('fix $cellar/st')).toEqual({ key: '$', query: 'cellar/st', start: 4, end: 14 });
  });

  it('takes the whole word when the caret is inside it', () => {
    expect(tokenAt('see @Nav now', 7)).toEqual({ key: '@', query: 'Nav', start: 4, end: 8 });
  });

  it('ignores words without a key, and keys mid-word', () => {
    expect(tokenAt('fix it')).toBeNull();
    expect(tokenAt('src/app')).toBeNull();
    expect(tokenAt('fix it ')).toBeNull();
  });

  it('opens on the bare key', () => {
    expect(tokenAt('run /')).toEqual({ key: '/', query: '', start: 4, end: 5 });
  });
});

const labels = (text: string) => keySuggestions(tokenAt(text)!, sources).map((s) => s.label);

describe('keySuggestions', () => {
  it('lists commands then projects after a bare $', () => {
    expect(labels('$')).toEqual(['$rebuild', '$preview', '$deploy', '$apk', '$cellar/', '$web-shop/']);
  });

  it('narrows commands by their start and projects by their name', () => {
    expect(labels('$de')).toEqual(['$deploy']);
    expect(labels('$shop')).toEqual(['$web-shop/']);
  });

  it('heads commands, projects, entries, files and skills by group', () => {
    const groups = (text: string) => keySuggestions(tokenAt(text)!, sources).map((s) => s.group);
    expect(groups('$')).toEqual([...Array(4).fill('commands · also buttons'), 'projects · pick one, then / for its entries', 'projects · pick one, then / for its entries']);
    expect(groups('$cellar/sticky')).toEqual(['entries in Cellar', null]);
    expect(groups('@src')).toEqual(['changed in this run', 'in the worktree']);
    expect(groups('/')).toEqual(['built in', 'yours']);
  });

  it('keeps the list open after picking a project', () => {
    expect(keySuggestions(tokenAt('$cel')!, sources)[0].keepOpen).toBe(true);
  });

  it('searches live entries inside one project by their words', () => {
    expect(labels('$cellar/sticky')).toEqual(['$cellar/inbox-swipe-feels-sticky-on-android', '+ new entry “sticky” in Cellar']);
  });

  it('lists every live entry of a project before any words', () => {
    expect(labels('$cellar/')).toEqual(['$cellar/inbox-swipe-feels-sticky-on-android', '$cellar/streak-pill-clips']);
  });

  it('has nothing for an unknown project', () => {
    expect(labels('$nope/x')).toEqual([]);
  });

  it('puts changed files first and keeps a line ref', () => {
    expect(labels('@src')).toEqual(['@src/NavIslands.tsx', '@src/app.json']);
    expect(labels('@nav:42')).toEqual(['@src/NavIslands.tsx:42']);
  });

  it('finds skills, the ones that start with the words first', () => {
    expect(labels('/re')).toEqual(['/review']);
    expect(labels('/')).toEqual(['/review', '/frontend-design']);
  });
});

describe('applySuggestion', () => {
  it('swaps the word and adds a space', () => {
    const token = tokenAt('ship $dep')!;
    const [pick] = keySuggestions(token, sources);
    expect(applySuggestion('ship $dep', token, pick)).toEqual({ text: 'ship $deploy ', caret: 13 });
  });

  it('adds no space after a project, so its entries come next', () => {
    const token = tokenAt('fix $cel')!;
    const pick = keySuggestions(token, sources).find((s) => s.keepOpen)!;
    expect(applySuggestion('fix $cel', token, pick)).toEqual({ text: 'fix $cellar/', caret: 12 });
  });

  it('does not double a space that is already there', () => {
    const token = tokenAt('a $dep b', 6)!;
    const [pick] = keySuggestions(token, sources);
    expect(applySuggestion('a $dep b', token, pick)).toEqual({ text: 'a $deploy b', caret: 10 });
  });
});

describe('keyPlan', () => {
  const says = (text: string) => keyPlan(text, sources).map((line) => `${line.token} ${line.says}`);

  it('spells out a line of many things, in order', () => {
    expect(
      says('fix $cellar/streak-pill-clips — make it #F59E0B in @StreakPill.tsx:12 with /frontend-design, then $apk'),
    ).toEqual([
      '$cellar/streak-pill-clips claims “streak pill clips” and moves it to doing',
      '#F59E0B passes the colour as plain #F59E0B',
      '@StreakPill.tsx:12 hands the agent that file first, at line 12',
      '/frontend-design the agent loads its frontend-design skill',
      '$apk the agent runs it when it gets there',
    ]);
  });

  it('runs a command first in the message as a job', () => {
    expect(says('  $deploy now')).toEqual(['$deploy runs straight away, as a job']);
  });

  it('makes a new entry from new words', () => {
    expect(says('$web-shop/fix-the-footer')).toEqual(['$web-shop/fix-the-footer makes an entry “fix the footer” in web shop']);
  });

  it('says what it does not know', () => {
    expect(says('$nope /nope $x/y')).toEqual([
      '$nope not a command or a project yet',
      '/nope no skill by that name yet',
      '$x/y no project by that name',
    ]);
  });

  it('leaves paths and urls alone', () => {
    expect(says('see src/app and https://x.dev/a')).toEqual([]);
  });
});
