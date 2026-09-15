/**
 * The rule behind "scrolling outside the list also scrolls the list".
 *
 * On a wide window a screen is a column of entries with a rail beside it and a
 * lot of page around both, and a wheel only ever moves whatever it happens to
 * be over. Pointing at the heading, the gutter or the empty margin and getting
 * nothing is the whole complaint.
 *
 * So the page hands the wheel to its list — *unless* the pointer is over
 * something that scrolls itself, which is the one case where the browser's own
 * answer is the right one. That single test covers every exception at once: the
 * list (it is its own scroller), the rail while it has somewhere to go, and any
 * sheet open over the top. A rail whose figures fit has nowhere to go, so it
 * fails the test and the wheel falls through to the list, which is what you
 * meant by pointing at a column that visibly cannot move.
 *
 * Pure and geometry-only — no DOM, no React. The walk up the tree belongs to
 * the hook; what counts as scrollable belongs here, where it can be tested.
 */

/** As much of a node's scroll geometry as the rule needs. */
export type ScrollBox = {
  scrollHeight: number;
  clientHeight: number;
  /** The computed `overflow-y`. `visible`, `hidden` and `clip` never scroll. */
  overflowY: string;
};

/**
 * A pixel of slack is not a scrollbar. Sub-pixel layout rounding leaves plenty
 * of boxes one unit taller than their content, and treating those as scrollable
 * would swallow the wheel over a rail that cannot move.
 */
const SLACK = 2;

export function scrollsItself(box: ScrollBox): boolean {
  if (box.overflowY !== 'auto' && box.overflowY !== 'scroll' && box.overflowY !== 'overlay') return false;
  return box.scrollHeight - box.clientHeight > SLACK;
}

/**
 * A wheel notch in pixels.
 *
 * `deltaMode` says what unit `deltaY` is in, and a mouse that reports lines or
 * pages is not exotic — Firefox does it by default. Taking `deltaY` raw there
 * moves the list three pixels per notch and reads as a dead wheel.
 */
export const WHEEL_LINE = 16;

export function wheelPixels(deltaY: number, deltaMode: number, viewport: number): number {
  if (deltaMode === 1) return deltaY * WHEEL_LINE;
  if (deltaMode === 2) return deltaY * viewport;
  return deltaY;
}
