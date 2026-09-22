import { dumpHint, dumpPlaceholder, oneLine, plan, returnHint, shouldSubmitOnReturn, splitLines } from '@/lib/dump';
import type { Draft } from '@/types/cellar';

const draft = (over: Partial<Draft> = {}): Draft => ({
  text: '',
  kind: 'idea',
  projectId: null,
  raw: false,
  ...over,
});

describe('oneLine', () => {
  it('collapses the newlines a soft keyboard sneaks in', () => {
    expect(oneLine('two\nhalves  of\tone thought')).toBe('two halves of one thought');
  });

  it('is empty for whitespace only', () => {
    expect(oneLine('  \n\t ')).toBe('');
  });
});

describe('splitLines', () => {
  it('ignores blank lines', () => {
    expect(splitLines('one\n\n  \ntwo\n')).toEqual(['one', 'two']);
  });
});

describe('plan', () => {
  it('makes exactly one entry in normal mode, however many newlines are in there', () => {
    expect(plan(draft({ text: 'a\nb\nc' }), null).drops).toEqual([{ text: 'a', lines: ['b', 'c'] }]);
  });

  it('leaves a single line with nothing under it', () => {
    expect(plan(draft({ text: 'a' }), null).drops).toEqual([{ text: 'a', lines: [] }]);
  });

  // The whole point of the change: a title and its detail, not one run-on.
  it('puts the first line on the entry and the rest under it, in order', () => {
    expect(plan(draft({ text: 'the nav island jumps\nonly on the phone\nsince 1.8' }), null).drops).toEqual([
      { text: 'the nav island jumps', lines: ['only on the phone', 'since 1.8'] },
    ]);
  });

  it('still collapses whitespace inside a line', () => {
    expect(plan(draft({ text: 'two  halves\tof one\nand   a note' }), null).drops).toEqual([
      { text: 'two halves of one', lines: ['and a note'] },
    ]);
  });

  it('drops blank lines rather than hanging an empty note', () => {
    expect(plan(draft({ text: 'a\n\n  \nb' }), null).drops).toEqual([{ text: 'a', lines: ['b'] }]);
  });

  it('is empty when normal mode has nothing but whitespace', () => {
    expect(plan(draft({ text: '  \n\n ' }), null).empty).toBe(true);
  });

  it('makes one entry per line in raw mode, and never a note', () => {
    expect(plan(draft({ text: 'a\nb\nc', raw: true }), null).drops).toEqual([
      { text: 'a', lines: [] },
      { text: 'b', lines: [] },
      { text: 'c', lines: [] },
    ]);
  });

  it('names the destination, and the count once there is more than one', () => {
    expect(plan(draft({ text: 'a' }), 'radar').label).toBe('drop into radar');
    expect(plan(draft({ text: 'a\nb', raw: true }), 'radar').label).toBe('drop 2 entries into radar');
  });

  // Normal mode is one entry however long the draft is, so the count never
  // appears there — the notes are not entries.
  it('does not count notes as entries in the label', () => {
    expect(plan(draft({ text: 'a\nb\nc' }), 'radar').label).toBe('drop into radar');
  });

  it('falls back to the inbox when no project is picked', () => {
    expect(plan(draft({ text: 'a' }), null).label).toBe('drop into inbox');
  });

  it('is empty for a raw dump of nothing but blank lines', () => {
    expect(plan(draft({ text: '\n\n  \n', raw: true }), null).empty).toBe(true);
  });
});

describe('dumpHint', () => {
  it('counts what return will actually create', () => {
    expect(dumpHint(draft({ raw: true, text: 'a\nb' }))).toBe('2 lines → 2 entries');
    expect(dumpHint(draft({ raw: true, text: 'a' }))).toBe('1 line → 1 entry');
    expect(dumpHint(draft({ raw: true, text: '' }))).toBe('one thought per line');
  });

  it('counts the notes a normal dump is about to hang under the thought', () => {
    expect(dumpHint(draft({ text: 'a\nb' }))).toBe('1 thought · 1 note');
    expect(dumpHint(draft({ text: 'a\nb\nc' }))).toBe('1 thought · 2 notes');
  });

  it('says what a new line does before there is one', () => {
    expect(dumpHint(draft({ text: 'a' }))).toBe('a new line becomes a note under it');
    expect(dumpHint(draft({ text: '' }))).toBe('a new line becomes a note under it');
  });
});

describe('shouldSubmitOnReturn', () => {
  it('drops on a bare return in normal mode, and makes a newline with shift', () => {
    expect(shouldSubmitOnReturn(false, { shift: false, meta: false })).toBe(true);
    expect(shouldSubmitOnReturn(false, { shift: true, meta: false })).toBe(false);
  });

  it('inverts in raw mode, where a newline is the content', () => {
    expect(shouldSubmitOnReturn(true, { shift: false, meta: false })).toBe(false);
    expect(shouldSubmitOnReturn(true, { shift: false, meta: true })).toBe(true);
  });
});

describe('copy', () => {
  it('gives each mode its own placeholder and key hint', () => {
    expect(dumpPlaceholder(false)).not.toBe(dumpPlaceholder(true));
    expect(returnHint(false, true)).not.toBe(returnHint(true, true));
  });

  it('names no modifier a soft keyboard does not have', () => {
    expect(returnHint(false, false)).not.toMatch(/shift|ctrl/);
    expect(returnHint(true, false)).not.toMatch(/shift|ctrl/);
    expect(returnHint(false, false)).not.toBe(returnHint(true, false));
  });
});
