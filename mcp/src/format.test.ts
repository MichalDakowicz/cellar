import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cellarOf, entry, NOW, question } from './fixtures.test-helpers.ts';
import { entryBrief } from './format.ts';

/**
 * The brief is the server's only real output.
 *
 * Everything an agent decides comes from this string, so the things worth
 * asserting are the ones that change what it does: that an unanswered question
 * is marked as not-to-act-on, that a settled one hands over the answer rather
 * than the question, and that the where-to-ask rule is actually in there.
 */

const brief = (over: Parameters<typeof entry>[0] = {}) => {
  const one = entry(over);
  return entryBrief(one, cellarOf(one), NOW);
};

describe('entryBrief — questions', () => {
  it('says nothing about questions when there are none', () => {
    const out = brief();
    assert.ok(!out.includes('still waiting on an answer'));
    assert.ok(!out.includes('asked and settled'));
  });

  it('lists an unanswered question with its id and tells the agent not to act on it', () => {
    const out = brief({ questions: [question('q1', 'one table or two columns?')] });
    assert.match(out, /still waiting on an answer — do not act on these:/);
    assert.match(out, /\? q1000000 one table or two columns\?/);
  });

  it('prints the options as a, b, c so the agent knows what it offered', () => {
    const out = brief({
      questions: [question('q1', 'which shape?', { options: ['a new table', 'columns on the line'] })],
    });
    assert.match(out, /a\) a new table/);
    assert.match(out, /b\) columns on the line/);
  });

  it('hands over the answer, not the question, once one is settled', () => {
    const out = brief({
      questions: [question('q1', 'which shape?', { answer: 'a new table', answeredAt: '2026-09-14T11:30:00.000Z' })],
    });
    assert.match(out, /asked and settled — build to these, do not ask again:/);
    assert.match(out, /= a new table/);
  });

  // A waved-off question is not an unanswered one: re-asking it is the exact
  // thing the user said no to.
  it('says a waved-off question was a decision, and to use judgement', () => {
    const out = brief({ questions: [question('q1', 'which shape?', { dismissedAt: '2026-09-14T11:30:00.000Z' })] });
    assert.match(out, /= waved off/);
    assert.match(out, /use your judgement/);
    assert.ok(!out.includes('still waiting on an answer'));
  });

  it('keeps the two halves apart when one is answered and one is not', () => {
    const out = brief({
      questions: [
        question('q1', 'first', { answer: 'this one', answeredAt: '2026-09-14T11:30:00.000Z' }),
        question('q2', 'second'),
      ],
    });
    const waiting = out.indexOf('still waiting on an answer');
    const settled = out.indexOf('asked and settled');
    assert.ok(waiting >= 0 && settled > waiting, 'outstanding questions come first');
    assert.match(out, /\? q2000000 second/);
  });

  it('carries the where-to-ask rule, which is the decision a model gets wrong', () => {
    const out = brief();
    assert.match(out, /ask where/);
    assert.match(out, /one task in this session: ask in the chat/);
    assert.match(out, /several tasks: cellar_ask on the entry, then move to the next one/);
  });
});
