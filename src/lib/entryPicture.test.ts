import {
  aspectOf,
  fitPixels,
  fitSize,
  isPictureLine,
  normalizeThumb,
  PICTURE_STEPS,
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

describe('fitPixels', () => {
  it('keeps a picture within the budget and keeps its shape', () => {
    const resize = fitPixels(4000, 3000, 1_500_000);
    expect(resize).not.toBeNull();
    const width = resize!.width;
    const height = Math.round((width * 3000) / 4000);
    // The manipulator rounds the other side itself, so allow a row of slack.
    expect(width * height).toBeLessThanOrEqual(1_500_000 * 1.001);
    expect(width / height).toBeCloseTo(4 / 3, 1);
  });

  it('shrinks a tall crop by the same rule and keeps its shape', () => {
    const resize = fitPixels(600, 6000, 1_500_000);
    expect(resize!.width).toBe(387);
    expect(resize!.width * 10).toBeLessThan(3880);
  });

  it('leaves a picture alone that is already within it', () => {
    expect(fitPixels(1000, 1000, 1_500_000)).toBeNull();
    expect(fitPixels(1500, 1000, 1_500_000)).toBeNull();
  });

  it('does nothing with a size it cannot read', () => {
    expect(fitPixels(0, 0, 1_500_000)).toBeNull();
  });
});

describe('PICTURE_STEPS', () => {
  it('only ever asks for less than the step before it', () => {
    PICTURE_STEPS.slice(1).forEach((step, index) => {
      const before = PICTURE_STEPS[index];
      expect(step.pixels <= before.pixels && step.quality <= before.quality).toBe(true);
      expect(step.pixels < before.pixels || step.quality < before.quality).toBe(true);
    });
  });
});

describe('aspectOf', () => {
  it('is the shape the picture has, with no clamp', () => {
    expect(aspectOf(400, 300)).toBeCloseTo(4 / 3);
    expect(aspectOf(360, 3600)).toBeCloseTo(0.1);
    expect(aspectOf(3000, 300)).toBeCloseTo(10);
  });

  it('falls back when the size is unknown', () => {
    expect(aspectOf(0, 0)).toBeCloseTo(4 / 3);
  });
});
