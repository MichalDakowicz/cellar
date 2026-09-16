import { showsHoverControl } from '@/lib/hoverReveal';

const reveal = (over: Partial<Parameters<typeof showsHoverControl>[0]> = {}) =>
  showsHoverControl({ hasHandler: true, isDesktop: true, onSurface: false, onControl: false, ...over });

describe('showsHoverControl', () => {
  it('is hidden on desktop until the pointer is on the surface', () => {
    expect(reveal()).toBe(false);
    expect(reveal({ onSurface: true })).toBe(true);
  });

  // The bug. The dot is drawn over the tile rather than inside it, so reaching
  // for it ends the tile's hover — and a reveal that only listens to the tile
  // takes the dot away from under the pointer mid-click.
  it('stays revealed once the pointer is on the control itself', () => {
    expect(reveal({ onSurface: false, onControl: true })).toBe(true);
  });

  it('is permanent where there is no hover to reveal it with', () => {
    expect(reveal({ isDesktop: false })).toBe(true);
  });

  it('is nothing at all without a handler, hovered or not', () => {
    expect(reveal({ hasHandler: false, onSurface: true, onControl: true })).toBe(false);
    expect(reveal({ hasHandler: false, isDesktop: false })).toBe(false);
  });
});
