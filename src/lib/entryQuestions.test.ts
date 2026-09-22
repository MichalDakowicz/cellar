import {
  answeredForAgent,
  isSettled,
  joinAnswers,
  MAX_OPTIONS,
  normalizeOptions,
  optionLabel,
  pendingQuestions,
  pendingSummary,
  pickedOptions,
  questionStatus,
  readyToResume,
  settledQuestions,
  unblocksEntry,
} from '@/lib/entryQuestions';

type Q = {
  id: string;
  question: string;
  answeredAt: string | null;
  dismissedAt: string | null;
  agent?: string | null;
};

const q = (id: string, over: Partial<Q> = {}): Q => ({
  id,
  question: `question ${id}`,
  answeredAt: null,
  dismissedAt: null,
  ...over,
});

describe('optionLabel', () => {
  it('reads a, b, c', () => {
    expect([0, 1, 2, 3].map(optionLabel)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('falls back to a number past the alphabet rather than undefined', () => {
    expect(optionLabel(26)).toBe('27');
  });
});

describe('normalizeOptions', () => {
  it('collapses each option to one line', () => {
    expect(normalizeOptions(['  a new\n  table  ', 'columns'])).toEqual(['a new table', 'columns']);
  });

  it('drops blanks, non-strings and duplicates', () => {
    expect(normalizeOptions(['keep', '', '   ', 7, null, 'KEEP', 'other'])).toEqual(['keep', 'other']);
  });

  it('caps the list so a model cannot hand over a form', () => {
    const many = Array.from({ length: 30 }, (_, index) => `option ${index}`);
    expect(normalizeOptions(many)).toHaveLength(MAX_OPTIONS);
  });

  it('treats anything that is not an array as no options', () => {
    expect(normalizeOptions(undefined)).toEqual([]);
    expect(normalizeOptions('a, b')).toEqual([]);
  });
});

describe('questionStatus', () => {
  it('is unanswered until a stamp lands', () => {
    expect(questionStatus(q('1'))).toBe('unanswered');
  });

  it('reads answered, then dismissed when both are set', () => {
    expect(questionStatus(q('1', { answeredAt: 'now' }))).toBe('answered');
    expect(questionStatus(q('1', { answeredAt: 'now', dismissedAt: 'later' }))).toBe('dismissed');
  });

  it('counts a dismissed question as settled — it is not a lesser answer', () => {
    expect(isSettled(q('1', { dismissedAt: 'now' }))).toBe(true);
  });
});

describe('the two halves of the section', () => {
  const list = [q('1', { answeredAt: 'then' }), q('2'), q('3', { dismissedAt: 'then' })];

  it('splits into what is owed and what is settled, keeping order', () => {
    expect(pendingQuestions(list).map((one) => one.id)).toEqual(['2']);
    expect(settledQuestions(list).map((one) => one.id)).toEqual(['1', '3']);
  });
});

describe('unblocksEntry', () => {
  it('is true when the one being settled is the last one owed', () => {
    expect(unblocksEntry([q('1', { answeredAt: 'then' }), q('2')], '2')).toBe(true);
  });

  it('is false while another question is still waiting', () => {
    expect(unblocksEntry([q('1'), q('2')], '2')).toBe(false);
  });

  it('is true for an entry with nothing outstanding — answering twice must not re-block it', () => {
    expect(unblocksEntry([q('1', { answeredAt: 'then' })], '1')).toBe(true);
  });
});

describe('pendingSummary', () => {
  it('is the question itself when one is waiting', () => {
    expect(pendingSummary([q('1')])).toBe('question 1');
  });

  it('is a count when several are, rather than two truncated sentences', () => {
    expect(pendingSummary([q('1'), q('2')])).toBe('2 questions waiting on you');
  });

  it('is null when nothing is waiting', () => {
    expect(pendingSummary([q('1', { answeredAt: 'then' })])).toBeNull();
  });
});

describe('readyToResume', () => {
  const entry = (state: string, questions: Q[], archived = false) =>
    ({ state, archived, questions }) as never;

  it('picks open entries carrying an answered question', () => {
    const list = [entry('open', [q('1', { answeredAt: 'then' })])];
    expect(readyToResume(list)).toHaveLength(1);
  });

  it('leaves out one still waiting, one already settled by hand, and one archived', () => {
    const list = [
      entry('blocked', [q('1')]),
      entry('done', [q('1', { answeredAt: 'then' })]),
      entry('open', [q('1', { answeredAt: 'then' })], true),
      entry('open', [q('1', { dismissedAt: 'then' })]),
      entry('open', []),
    ];
    expect(readyToResume(list)).toEqual([]);
  });
});

describe('answeredForAgent', () => {
  const entry = (id: string, state: string, questions: Q[], archived = false) =>
    ({ id, state, archived, questions }) as never;

  it('returns only the questions this agent asked, and only the settled ones', () => {
    const mine = q('1', { answeredAt: 'then', agent: 'claude' });
    const list = [
      entry('a', 'open', [mine, q('2', { answeredAt: 'then', agent: 'codex' }), q('3', { agent: 'claude' })]),
    ];
    expect(answeredForAgent(list, 'claude')).toEqual([{ entry: list[0], questions: [mine] }]);
  });

  it('counts a dismissed question — waving it off is a decision, not silence', () => {
    const list = [entry('a', 'open', [q('1', { dismissedAt: 'then', agent: 'claude' })])];
    expect(answeredForAgent(list, 'claude')).toHaveLength(1);
  });

  it('matches the name regardless of case or padding', () => {
    const list = [entry('a', 'open', [q('1', { answeredAt: 'then', agent: ' Claude ' })])];
    expect(answeredForAgent(list, 'claude')).toHaveLength(1);
  });

  it('skips anything that is not an open, unarchived thought', () => {
    const answered = { answeredAt: 'then', agent: 'claude' };
    const list = [
      entry('a', 'blocked', [q('1', answered)]),
      entry('b', 'done', [q('1', answered)]),
      entry('c', 'doing', [q('1', answered)]),
      entry('d', 'open', [q('1', answered)], true),
    ];
    expect(answeredForAgent(list, 'claude')).toEqual([]);
  });

  it('is empty for an agent with no name rather than matching every unstamped question', () => {
    const list = [entry('a', 'open', [q('1', { answeredAt: 'then', agent: null })])];
    expect(answeredForAgent(list, '  ')).toEqual([]);
  });
});

/**
 * The two halves of answering with more than one option. The letters never
 * leave the UI — an answer of "c and d both" is what this pair exists to stop.
 */
describe('joinAnswers', () => {
  it('is the option itself when there is one', () => {
    expect(joinAnswers(['a board'])).toBe('a board');
  });

  it('joins two with and', () => {
    expect(joinAnswers(['the title on the row', 'a preview card'])).toBe('the title on the row and a preview card');
  });

  it('joins three as a list', () => {
    expect(joinAnswers(['one', 'two', 'three'])).toBe('one, two and three');
  });

  it('is empty when nothing is held, so nothing is sent', () => {
    expect(joinAnswers([])).toBe('');
    expect(joinAnswers(['   '])).toBe('');
  });
});

describe('pickedOptions', () => {
  const options = ['the title on the row', 'a preview card', 'nothing at all'];

  it('finds every option the answer names', () => {
    expect(pickedOptions('the title on the row and a preview card', options)).toEqual([
      'the title on the row',
      'a preview card',
    ]);
  });

  it('ignores case, because an answer is prose', () => {
    expect(pickedOptions('A Preview Card', options)).toEqual(['a preview card']);
  });

  it('marks nothing for an answer typed in their own words', () => {
    expect(pickedOptions('neither, do it later', options)).toEqual([]);
  });

  it('marks nothing when there is no answer', () => {
    expect(pickedOptions(null, options)).toEqual([]);
    expect(pickedOptions('', options)).toEqual([]);
  });
});
