import {
  isSettled,
  MAX_OPTIONS,
  normalizeOptions,
  optionLabel,
  pendingQuestions,
  pendingSummary,
  questionStatus,
  readyToResume,
  settledQuestions,
  unblocksEntry,
} from '@/lib/entryQuestions';

type Q = { id: string; question: string; answeredAt: string | null; dismissedAt: string | null };

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
