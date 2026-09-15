import { KINDS, kindMeta, kindTallyLabel } from '@/lib/kinds';

describe('kindMeta', () => {
  it('falls back to the default kind rather than throwing', () => {
    expect(kindMeta('nonsense').value).toBe('idea');
    expect(kindMeta(null).value).toBe('idea');
  });
});

describe('kindTallyLabel', () => {
  // "addition" was folded into "idea", so a bar reading `idea` undersells the
  // bucket it is counting.
  it('names both halves of the idea bucket', () => {
    expect(kindTallyLabel('idea')).toBe('idea/addition');
  });

  it('leaves every other kind as its stored value', () => {
    for (const kind of KINDS.filter((meta) => meta.value !== 'idea')) {
      expect(kindTallyLabel(kind.value)).toBe(kind.value);
    }
  });
});
