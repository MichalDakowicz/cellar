import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveProject } from './cellar.ts';
import { resolveQuestion } from './questions.ts';
import { question } from './fixtures.test-helpers.ts';
import type { Project } from '@/types/cellar';

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

/**
 * Resolving a project by the prefixed id the app copies.
 *
 * The prefix is what keeps `p-9b1cde07` from reading as an entry id on the way
 * across, so this end has to take it back off — for the id match only. A
 * project someone named `p-old` is still a project with that name.
 */

function proj(id: string, name: string): Project {
  return {
    id,
    shelfId: 's1',
    name,
    position: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    repoPath: null,
    repoUrl: null,
    pinned: false,
  };
}

const cellarProject = proj('9b1cde07-2f44-4d3a-9c21-0e7a51b6d004', 'cellar');
const radar = proj('4a4986e4-bbc1-4e71-a41e-9e7772745a00', 'radar');

describe('resolveProject', () => {
  it('finds one by the bare short id', () => {
    assert.equal(resolveProject('9b1cde07', [cellarProject, radar]).name, 'cellar');
  });

  it('finds one by the p- form the app copies', () => {
    assert.equal(resolveProject('p-9b1cde07', [cellarProject, radar]).name, 'cellar');
    assert.equal(resolveProject('  P-9b1cde07 ', [cellarProject, radar]).name, 'cellar');
  });

  it('still finds one by name', () => {
    assert.equal(resolveProject('radar', [cellarProject, radar]).id, radar.id);
  });

  // The prefix is stripped for ids and never for names, so this still works.
  it('finds a project actually called p-something by that name', () => {
    const odd = proj('22de3311-0000-0000-0000-000000000000', 'p-old');
    assert.equal(resolveProject('p-old', [cellarProject, odd]).id, odd.id);
  });

  it('says so when nothing matches', () => {
    assert.throws(() => resolveProject('p-zzzzzzzz', [cellarProject]), /No project called/);
  });
});
