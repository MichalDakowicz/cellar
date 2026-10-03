import {
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
    expect(writablePicture({ thumb: small, data: small })).toBe(true);
    expect(writablePicture({ thumb: 'nope', data: small })).toBe(false);
    expect(writablePicture({ thumb: small, data: pictureDataUri('A'.repeat(PICTURE_MAX_CHARS)) })).toBe(false);
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
    { id: 'a', entryId: 'e1', lineId: null, thumb: small },
    { id: 'b', entryId: 'e1', lineId: 'l1', thumb: small },
    { id: 'c', entryId: 'e2', lineId: null, thumb: small },
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
    expect(normalizeThumb({ id: 'a', entry_id: 'e1', line_id: null, thumb: small })).toEqual({
      id: 'a',
      entryId: 'e1',
      lineId: null,
      thumb: small,
    });
  });

  it('drops a row whose thumb is not an image', () => {
    expect(normalizeThumb({ id: 'a', entry_id: 'e1', line_id: null, thumb: 'x' })).toBeNull();
  });
});
