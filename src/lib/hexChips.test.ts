import { inkFor, nudgeHex, parseHex, splitHex } from './hexChips';

const hexes = (text: string) => splitHex(text).filter((s) => s.type === 'hex').map((s) => s.value);

describe('splitHex', () => {
  it('finds 3, 6 and 8 digit codes', () => {
    expect(hexes('make it #fff, then #64748B and #64748BCC')).toEqual(['#fff', '#64748B', '#64748BCC']);
  });

  it('leaves everything else after a # as text', () => {
    expect(hexes('#later #12 #ggg #ffff #fffffff')).toEqual([]);
  });

  it('does not match inside a word, a heading or an entity', () => {
    expect(hexes('a#fff ##fff &#fff;')).toEqual([]);
  });

  it('keeps the text around a code', () => {
    expect(splitHex('the pill #F59E0B.')).toEqual([
      { type: 'text', value: 'the pill ' },
      { type: 'hex', value: '#F59E0B', ink: expect.any(String) },
      { type: 'text', value: '.' },
    ]);
  });

  it('returns one text segment when there is nothing to paint', () => {
    expect(splitHex('nothing here')).toEqual([{ type: 'text', value: 'nothing here' }]);
    expect(splitHex('')).toEqual([{ type: 'text', value: '' }]);
  });
});

describe('parseHex', () => {
  it('expands a short code and reads the alpha', () => {
    expect(parseHex('#abc')).toEqual([170, 187, 204, 1]);
    expect(parseHex('#00000080')![3]).toBeCloseTo(0.5, 2);
    expect(parseHex('#12')).toBeNull();
  });
});

describe('inkFor', () => {
  it('puts dark text on light colours and light text on dark ones', () => {
    expect(inkFor('#FAFAFA')).toBe('#0a0a0a');
    expect(inkFor('#F59E0B')).toBe('#0a0a0a');
    expect(inkFor('#0A0A0A')).toBe('#fafafa');
    expect(inkFor('#262626')).toBe('#fafafa');
  });

  it('judges a translucent code over the dark ground', () => {
    expect(inkFor('#FFFFFF10')).toBe('#fafafa');
  });
});

describe('nudgeHex', () => {
  it('goes lighter and darker by lightness', () => {
    expect(nudgeHex('#808080', 0.1)).toBe('#9a9a9a');
    expect(nudgeHex('#808080', -0.1)).toBe('#676767');
  });

  it('keeps the hue', () => {
    const [r, g, b] = parseHex(nudgeHex('#3b82f6', -0.1))!;
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it('keeps the case it was typed in, and the alpha', () => {
    expect(nudgeHex('#64748BCC', 0.05)).toMatch(/^#[0-9A-F]{6}CC$/);
    expect(nudgeHex('#64748b', 0.05)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('writes a short code back long', () => {
    expect(nudgeHex('#000', 0.1)).toBe('#1a1a1a');
  });

  it('stops at white and black', () => {
    expect(nudgeHex('#ffffff', 0.2)).toBe('#ffffff');
    expect(nudgeHex('#000000', -0.2)).toBe('#000000');
  });

  it('leaves a non-code alone', () => {
    expect(nudgeHex('#ggg', 0.1)).toBe('#ggg');
  });
});
