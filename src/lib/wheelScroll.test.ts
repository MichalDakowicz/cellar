import { scrollsItself, WHEEL_LINE, wheelPixels } from '@/lib/wheelScroll';

describe('scrollsItself', () => {
  it('is true for a box with overflow it can reach', () => {
    expect(scrollsItself({ scrollHeight: 800, clientHeight: 400, overflowY: 'auto' })).toBe(true);
    expect(scrollsItself({ scrollHeight: 800, clientHeight: 400, overflowY: 'scroll' })).toBe(true);
  });

  // The rail whose figures fit. This is the case the wheel is supposed to fall
  // through, so the list gets it instead.
  it('is false for a box whose content fits', () => {
    expect(scrollsItself({ scrollHeight: 400, clientHeight: 400, overflowY: 'auto' })).toBe(false);
  });

  it('is false however much overflow a box that cannot scroll has', () => {
    expect(scrollsItself({ scrollHeight: 9000, clientHeight: 400, overflowY: 'visible' })).toBe(false);
    expect(scrollsItself({ scrollHeight: 9000, clientHeight: 400, overflowY: 'hidden' })).toBe(false);
  });

  it('does not call a pixel of rounding a scrollbar', () => {
    expect(scrollsItself({ scrollHeight: 401, clientHeight: 400, overflowY: 'auto' })).toBe(false);
    expect(scrollsItself({ scrollHeight: 404, clientHeight: 400, overflowY: 'auto' })).toBe(true);
  });
});

describe('wheelPixels', () => {
  it('passes pixel deltas through', () => {
    expect(wheelPixels(120, 0, 700)).toBe(120);
  });

  // Firefox reports lines by default; raw deltaY there is a dead wheel.
  it('turns a line delta into pixels', () => {
    expect(wheelPixels(3, 1, 700)).toBe(3 * WHEEL_LINE);
  });

  it('turns a page delta into a viewport', () => {
    expect(wheelPixels(1, 2, 700)).toBe(700);
  });

  it('keeps the direction of a scroll back up', () => {
    expect(wheelPixels(-3, 1, 700)).toBe(-3 * WHEEL_LINE);
  });
});
