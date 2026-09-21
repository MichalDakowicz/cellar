/**
 * Stepping between shelves by dragging across the *file it* block, instead of
 * opening the picker for it.
 *
 * The picker is the right control for a cellar with eight shelves. With two or
 * three it is a sheet, a list and a tap to move one place along a line you can
 * already see — so the block you are filing into is also the thing you drag.
 *
 * Two separate thresholds, because a pan has to answer two questions at
 * different moments. `claimsHorizontalPan` runs while the finger is still down
 * and decides whether this is a shelf drag at all: it has to be generous enough
 * to catch the gesture early, before the vertical scroll takes it, and mean
 * enough to leave a tap on a project chip alone. `swipeDirection` runs on
 * release and decides whether the drag went far and straight enough to count.
 *
 * Pure, no React and no react-native: the numbers are the design decision, and
 * they should be readable and testable without a renderer.
 */

export type SwipeDirection = 'next' | 'previous';

/** Past this, and flatter than tall, a drag is ours rather than the scroll's. */
export const SWIPE_CLAIM_DISTANCE = 12;

/** How far a claimed drag must actually run before it changes anything. */
export const SWIPE_MIN_DISTANCE = 48;

/**
 * How much taller than wide a drag may be and still count, on release.
 *
 * Looser than the claim test on purpose: a thumb that starts flat and curls
 * upward has already committed to the gesture, and refusing it then leaves the
 * shelf unchanged with no way to tell why.
 */
export const SWIPE_MAX_SLOPE = 0.8;

export function claimsHorizontalPan(dx: number, dy: number): boolean {
  return Math.abs(dx) > SWIPE_CLAIM_DISTANCE && Math.abs(dx) > Math.abs(dy);
}

export function swipeDirection(dx: number, dy: number): SwipeDirection | null {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dy) > Math.abs(dx) * SWIPE_MAX_SLOPE) return null;
  // Dragging left pulls the next shelf in from the right, the way a pager does.
  return dx < 0 ? 'next' : 'previous';
}

/**
 * The shelf a swipe lands on. Wraps, because a line you step along one place at
 * a time with no visible end needs no dead end either.
 *
 * `null` when there is nowhere to go — one shelf, or none. The caller can
 * therefore hand the result straight to the setter, and a cellar with a single
 * shelf simply does not respond to the gesture.
 */
export function cycleShelf<T extends { id: string }>(
  shelves: T[],
  currentId: string | null,
  direction: SwipeDirection,
): string | null {
  if (shelves.length < 2) return null;
  const at = shelves.findIndex((shelf) => shelf.id === currentId);
  // An id that matches nothing is the first shelf — the same fallback
  // `useCurrentShelf` makes, so the swipe agrees with what the pill shows.
  const from = at === -1 ? 0 : at;
  const step = direction === 'next' ? 1 : -1;
  return shelves[(from + step + shelves.length) % shelves.length].id;
}

/**
 * How far the block travels under the finger, and how far it slides off before
 * the next shelf arrives.
 *
 * Damped rather than one-to-one: the block is not going anywhere — it is
 * telling you a drag has been noticed and which way it is reading. A panel
 * that tracks the finger exactly promises a page turn that never comes, and at
 * 48px of commit distance a full-width slide would be mostly off screen before
 * anything happened.
 */
export const SWIPE_DAMPING = 0.45;

/** The cap, which is also the distance the block leaves and re-enters by. */
export const SWIPE_TRAVEL = 64;

export function dragOffset(dx: number): number {
  const damped = dx * SWIPE_DAMPING;
  if (damped > SWIPE_TRAVEL) return SWIPE_TRAVEL;
  if (damped < -SWIPE_TRAVEL) return -SWIPE_TRAVEL;
  return damped;
}

/** Which way the block leaves: a drag to the left carries it left. */
export function exitOffset(direction: SwipeDirection): number {
  return direction === 'next' ? -SWIPE_TRAVEL : SWIPE_TRAVEL;
}
