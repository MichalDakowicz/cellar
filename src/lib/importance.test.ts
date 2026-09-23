import { DEFAULT_IMPORTANCE, IMPORTANCES, importanceMeta, importanceOf, isImportance } from '@/lib/importance';

describe('importance', () => {
  it('is three levels, low to high', () => {
    expect(IMPORTANCES.map((meta) => meta.value)).toEqual(['low', 'normal', 'high']);
  });

  it('marks only the two exceptions', () => {
    expect(importanceMeta('high').marked).toBe(true);
    expect(importanceMeta('low').marked).toBe(true);
    expect(importanceMeta('normal').marked).toBe(false);
  });

  it('reads a word it does not know as normal rather than blank', () => {
    expect(importanceOf('urgent')).toBe(DEFAULT_IMPORTANCE);
    expect(importanceOf(null)).toBe('normal');
    expect(importanceMeta(undefined).value).toBe('normal');
  });

  it('knows its own words', () => {
    expect(isImportance('high')).toBe(true);
    expect(isImportance('HIGH')).toBe(false);
  });
});
