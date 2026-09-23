import { entryTrail, patchEvents, type TrailEvent } from '@/lib/entryTrail';
import type { EntryLine, EntryQuestion } from '@/types/cellar';

const projects = [
  { id: 'p1', name: 'cellar' },
  { id: 'p2', name: 'radar' },
];

const before = { state: 'open' as const, kind: 'idea' as const, projectId: null, archived: false };
const you = { source: 'user' as const, agent: null };

describe('patchEvents', () => {
  it('writes one row per field that actually moved', () => {
    expect(patchEvents(before, { state: 'doing', kind: 'glitch' }, you)).toEqual([
      { what: 'state', fromValue: 'open', toValue: 'doing', source: 'user', agent: null },
      { what: 'kind', fromValue: 'idea', toValue: 'glitch', source: 'user', agent: null },
    ]);
  });

  it('writes nothing for a field set to what it already was', () => {
    expect(patchEvents(before, { state: 'open', archived: false }, you)).toEqual([]);
  });

  it('logs filing with where it came from and where it went', () => {
    expect(patchEvents(before, { projectId: 'p1' }, you)).toEqual([
      { what: 'filed', fromValue: null, toValue: 'p1', source: 'user', agent: null },
    ]);
  });

  it('names archiving and bringing back as two different moves', () => {
    expect(patchEvents(before, { archived: true }, you)[0].what).toBe('archived');
    expect(patchEvents({ ...before, archived: true }, { archived: false }, you)[0].what).toBe('restored');
  });

  it('reads a missing importance as normal, the column default', () => {
    expect(patchEvents(before, { importance: 'normal' }, you)).toEqual([]);
    expect(patchEvents(before, { importance: 'high' }, you)[0]).toMatchObject({ fromValue: 'normal', toValue: 'high' });
  });

  it('writes nothing for an empty patch', () => {
    expect(patchEvents(before, {}, you)).toEqual([]);
  });
});

const line = (id: string, text: string, createdAt: string, source: 'user' | 'agent' = 'user'): EntryLine => ({
  id,
  text,
  createdAt,
  source,
});

const question = (over: Partial<EntryQuestion>): EntryQuestion => ({
  id: 'q1',
  question: 'which surface?',
  options: [],
  answer: null,
  answeredAt: null,
  answeredVia: null,
  dismissedAt: null,
  agent: 'claude',
  createdAt: '2026-09-22T12:00:00.000Z',
  ...over,
});

const event = (over: Partial<TrailEvent>): TrailEvent => ({
  id: 'e1',
  what: 'state',
  fromValue: 'open',
  toValue: 'doing',
  source: 'agent',
  agent: 'claude',
  at: '2026-09-22T11:00:00.000Z',
  ...over,
});

const entry = {
  id: 'x',
  createdAt: '2026-09-22T10:00:00.000Z',
  projectId: 'p1',
  agent: null,
  lines: [] as EntryLine[],
  questions: [] as EntryQuestion[],
};

describe('entryTrail', () => {
  it('starts with the drop, even for a thought with nothing logged', () => {
    expect(entryTrail(entry, [], projects)).toEqual([
      { key: 'dropped', at: entry.createdAt, text: 'dropped into cellar', source: 'user', agent: null },
    ]);
  });

  it('merges stamps and logged moves into one order, oldest first', () => {
    const trail = entryTrail(
      {
        ...entry,
        lines: [line('l1', 'on the web too', '2026-09-22T10:30:00.000Z'), line('l2', 'fixed in the sheet', '2026-09-22T13:00:00.000Z', 'agent')],
        questions: [question({ answer: 'both', answeredAt: '2026-09-22T12:30:00.000Z' })],
      },
      [event({})],
      projects,
    );
    expect(trail.map((item) => item.text)).toEqual([
      'dropped into cellar',
      'added "on the web too"',
      'open → doing',
      'asked "which surface?"',
      'answered "both"',
      'reported "fixed in the sheet"',
    ]);
  });

  it('knows where a thought was dropped when it has since been moved', () => {
    const trail = entryTrail({ ...entry, projectId: 'p2' }, [event({ what: 'filed', fromValue: null, toValue: 'p2' })], projects);
    expect(trail[0].text).toBe('dropped into the inbox');
    expect(trail[1].text).toBe('filed into radar');
  });

  it('says a project is gone rather than printing its id', () => {
    const trail = entryTrail(entry, [event({ what: 'filed', fromValue: 'p1', toValue: 'zz' })], projects);
    expect(trail[1].text).toBe('moved from cellar to a project since deleted');
  });

  it('says a question was waved off, and that a chat answer came from the chat', () => {
    const waved = entryTrail({ ...entry, questions: [question({ dismissedAt: '2026-09-22T12:10:00.000Z' })] }, [], projects);
    expect(waved.at(-1)?.text).toBe('waved a question off');
    const chat = entryTrail(
      { ...entry, questions: [question({ answer: 'a', answeredAt: '2026-09-22T12:10:00.000Z', answeredVia: 'chat' })] },
      [],
      projects,
    );
    expect(chat.at(-1)?.text).toBe('answered in the chat "a"');
  });

  it('keeps two moves with one stamp in the order they were written', () => {
    const at = '2026-09-22T11:00:00.000Z';
    const trail = entryTrail(entry, [event({ id: 'a', what: 'claimed', at }), event({ id: 'b', at })], projects);
    expect(trail.slice(1).map((item) => item.text)).toEqual(['picked up', 'open → doing']);
  });
});
