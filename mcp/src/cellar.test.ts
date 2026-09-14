import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveQuestion } from './cellar.ts';
import { question } from './fixtures.test-helpers.ts';

/**
 * Resolving a question by the short id the brief printed.
 *
 * Same contract as `resolveEntry`: ids travel from one tool result into the
 * next argument, so a prefix has to work — and an ambiguous one has to be
 * refused rather than guessed, because guessing here writes the user's answer
 * onto a question they were not answering.
 */

const q1 = question('q1', 'first');
const q2 = question('q2', 'second');

describe('resolveQuestion', () => {
  it('finds one by its full id', () => {
    assert.equal(resolveQuestion(q1.id, [q1, q2]).question, 'first');
  });

  it('finds one by the short id the brief prints', () => {
    assert.equal(resolveQuestion('q2000000', [q1, q2]).question, 'second');
  });

  it('is case insensitive, because the id is copied out of text', () => {
    assert.equal(resolveQuestion('Q2000000', [q1, q2]).question, 'second');
  });

  it('refuses a prefix that matches two rather than picking one', () => {
    const same = [question('q1', 'first'), { ...question('q1', 'second'), id: `${q1.id.slice(0, 8)}-dupe` }];
    assert.throws(() => resolveQuestion(q1.id.slice(0, 4), same), /matches 2 questions/);
  });

  it('says so when nothing matches', () => {
    assert.throws(() => resolveQuestion('zzzz', [q1]), /No question on this entry/);
  });

  it('refuses an empty ref rather than returning the first question', () => {
    assert.throws(() => resolveQuestion('   ', [q1, q2]), /No question id given/);
  });
});
