import { nextSeen, noticeKey, pendingNotices, SEEN_LIMIT } from '@/lib/questionNotices';
import type { Entry, EntryLine, EntryState, Project } from '@/types/cellar';

const line = (id: string, text: string, source: 'user' | 'agent'): EntryLine => ({
  id,
  text,
  createdAt: '2026-09-14T10:00:00.000Z',
  source,
});

const entry = (over: Partial<Entry> = {}): Entry => ({
  id: 'e1',
  projectId: 'p1',
  text: 'the nav island jumps on keyboard open',
  kind: 'glitch',
  state: 'blocked' as EntryState,
  archived: false,
  createdAt: '2026-09-14T09:00:00.000Z',
  agent: 'claude',
  lines: [line('l1', 'which surface — dump, filter, or both?', 'agent')],
  ...over,
});

const projects: Project[] = [
  { id: 'p1', shelfId: 's1', name: 'cellar', position: 0, createdAt: '', repoPath: null, repoUrl: null },
];

describe('pendingNotices', () => {
  it('raises a blocked question nobody has been shown yet', () => {
    const [notice] = pendingNotices([entry()], projects, []);
    expect(notice.entryId).toBe('e1');
    expect(notice.title).toBe('cellar — the nav island jumps on keyboard open');
    expect(notice.body).toBe('which surface — dump, filter, or both?');
  });

  // The failure that gets notifications switched off: the same question again
  // on every background wake.
  it('does not raise one that has already been shown', () => {
    const seen = pendingNotices([entry()], projects, []).map((notice) => notice.key);
    expect(pendingNotices([entry()], projects, seen)).toEqual([]);
  });

  it('raises again when the agent asks something new', () => {
    const asked = entry();
    const again = entry({ lines: [...asked.lines, line('l2', 'or just the phone build?', 'agent')] });
    const seen = pendingNotices([asked], projects, []).map((notice) => notice.key);
    expect(pendingNotices([again], projects, seen)).toHaveLength(1);
  });

  it('ignores everything that is not blocked', () => {
    expect(pendingNotices([entry({ state: 'doing' }), entry({ state: 'open' })], projects, [])).toEqual([]);
  });

  it('ignores an archived question', () => {
    expect(pendingNotices([entry({ archived: true })], projects, [])).toEqual([]);
  });

  it('stays quiet when nothing was actually asked', () => {
    expect(pendingNotices([entry({ lines: [line('l1', 'a thought of mine', 'user')] })], projects, [])).toEqual([]);
  });

  it('names the inbox nothing rather than guessing a project', () => {
    const [notice] = pendingNotices([entry({ projectId: null })], projects, []);
    expect(notice.title).toBe('the nav island jumps on keyboard open');
  });

  it('takes the last question, not the first', () => {
    const grown = entry({ lines: [line('l1', 'first', 'agent'), line('l2', 'second', 'agent')] });
    expect(pendingNotices([grown], projects, [])[0].body).toBe('second');
  });
});

describe('noticeKey', () => {
  it('changes when a new question is appended', () => {
    const first = noticeKey(entry());
    const second = noticeKey(entry({ lines: [line('l1', 'a', 'agent'), line('l2', 'b', 'agent')] }));
    expect(first).not.toBe(second);
  });
});

describe('nextSeen', () => {
  it('keeps a key while its entry is still blocked', () => {
    const blocked = entry();
    expect(nextSeen([blocked], [], ['e1:l1'])).toEqual(['e1:l1']);
  });

  // Otherwise the list grows for the life of the install.
  it('forgets a key once the question has been answered', () => {
    expect(nextSeen([entry({ state: 'open' })], ['e1:l1'], [])).toEqual([]);
  });

  it('is bounded', () => {
    const many = Array.from({ length: SEEN_LIMIT + 50 }, (_, index) => ({
      ...entry({ id: `e${index}`, lines: [line(`l${index}`, 'q', 'agent')] }),
    }));
    const keys = many.map((one) => `${one.id}:l${one.id.slice(1)}`);
    expect(nextSeen(many, keys, [])).toHaveLength(SEEN_LIMIT);
  });
});
