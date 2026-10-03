import { checkThought } from '@/lib/thoughtEdit';

describe('checkThought', () => {
  it('accepts new words, trimmed and on one line', () => {
    expect(checkThought('  a better\n thought ', 'old')).toEqual({ ok: true, text: 'a better thought' });
  });

  it('refuses an empty thought', () => {
    expect(checkThought('  \n ', 'old')).toMatchObject({ ok: false, reason: 'empty' });
  });

  it('refuses the wording it already has', () => {
    expect(checkThought(' old ', 'old')).toMatchObject({ ok: false, reason: 'unchanged' });
  });

  it('counts a change of whitespace only as no change', () => {
    expect(checkThought('one   two', 'one two')).toMatchObject({ ok: false, reason: 'unchanged' });
  });
});
