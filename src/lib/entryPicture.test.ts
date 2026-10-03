import {
  boxAspect,
  fitSize,
  isPictureLine,
  normalizeThumb,
  PICTURE_LINE,
  PICTURE_MAX_CHARS,
  pictureDataUri,
  pictureOf,
  picturesOf,
  THUMB_MAX_CHARS,
  writablePicture,
} from '@/lib/entryPicture';

const small = pictureDataUri('AAAA');

describe('pictureOf', () => {
  it('draws an image data uri', () => {
    expect(pictureOf(small)).toBe(small);
  });

  it('refuses anything that is not an image data uri', () => {
    expect(pictureOf('https://example.com/a.png')).toBeNull();
    expect(pictureOf('data:text/html;base64,AAAA')).toBeNull();
    expect(pictureOf(null)).toBeNull();
    expect(pictureOf(42)).toBeNull();
  });

  it('refuses one past its cap', () => {
    const big = pictureDataUri('A'.repeat(PICTURE_MAX_CHARS));
    expect(pictureOf(big)).toBeNull();
    expect(pictureOf(pictureDataUri('A'.repeat(THUMB_MAX_CHARS)), THUMB_MAX_CHARS)).toBeNull();
  });
});

describe('writablePicture', () => {
  it('needs both halves to be sane', () => {
    expect(writablePicture({ thumb: small, data: small, width: 1, height: 1 })).toBe(true);
    expect(writablePicture({ thumb: 'nope', data: small, width: 1, height: 1 })).toBe(false);
    expect(writablePicture({ thumb: small, data: pictureDataUri('A'.repeat(PICTURE_MAX_CHARS)), width: 1, height: 1 })).toBe(false);
  });
});

describe('isPictureLine', () => {
  it('knows a note that is only a picture', () => {
    expect(isPictureLine(PICTURE_LINE)).toBe(true);
    expect(isPictureLine('the receipt')).toBe(false);
  });
});

describe('picturesOf', () => {
  const thumbs = [
    { id: 'a', entryId: 'e1', lineId: null, thumb: small, width: 10, height: 10 },
    { id: 'b', entryId: 'e1', lineId: 'l1', thumb: small, width: 10, height: 10 },
    { id: 'c', entryId: 'e2', lineId: null, thumb: small, width: 10, height: 10 },
  ];

  it('splits one thought into its cover and its note pictures', () => {
    const mine = picturesOf(thumbs, 'e1');
    expect(mine.cover?.id).toBe('a');
    expect(mine.byLine.get('l1')?.id).toBe('b');
    expect(mine.byLine.size).toBe(1);
  });

  it('is empty for a thought with none', () => {
    const none = picturesOf(thumbs, 'e9');
    expect(none.cover).toBeNull();
    expect(none.byLine.size).toBe(0);
  });
});

describe('normalizeThumb', () => {
  it('maps a row', () => {
    expect(normalizeThumb({ id: 'a', entry_id: 'e1', line_id: null, thumb: small, width: 8, height: 6 })).toEqual({
      id: 'a',
      entryId: 'e1',
      lineId: null,
      thumb: small,
      width: 8,
      height: 6,
    });
  });

  it('drops a row whose thumb is not an image', () => {
    expect(normalizeThumb({ id: 'a', entry_id: 'e1', line_id: null, thumb: 'x', width: 1, height: 1 })).toBeNull();
  });
});

describe('fitSize', () => {
  it('brings the longest side down and lets the other follow', () => {
    expect(fitSize(3000, 1500, 1000)).toEqual({ width: 1000 });
    expect(fitSize(1200, 2400, 1000)).toEqual({ height: 1000 });
  });

  it('never upscales', () => {
    expect(fitSize(800, 600, 1000)).toBeNull();
    expect(fitSize(1000, 1000, 1000)).toBeNull();
  });
});

describe('boxAspect', () => {
  it('keeps a picture its own shape', () => {
    expect(boxAspect(400, 300)).toBeCloseTo(4 / 3);
  });

  it('clamps a tall screenshot and a wide strip', () => {
    expect(boxAspect(360, 1600)).toBe(0.6);
    expect(boxAspect(3000, 300)).toBe(2);
  });

  it('falls back when the size is unknown', () => {
    expect(boxAspect(0, 0)).toBeCloseTo(4 / 3);
  });
});
