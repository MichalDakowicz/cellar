/**
 * The rule behind a control that only appears while the pointer is on the thing
 * it belongs to.
 *
 * A tile reveals its edit dot on hover, and the dot is drawn *over* the tile
 * rather than inside it — it has to be its own pressable, because a pressable
 * nested in a pressed parent swallows the press on Android. That is also what
 * makes it easy to get wrong: the dot is a sibling, so the moment the pointer
 * reaches it the tile is no longer the thing under the cursor, the tile's hover
 * ends, and a control revealed by the tile's hover alone disappears exactly
 * when you go to click it. The web build had precisely that — the dot flickered
 * out from under the pointer and the click fell through to the tile.
 *
 * So the pointer being on the control counts as being on the surface. One
 * reveal, two places it can be kept alive from, and the reach never breaks it.
 *
 * Nothing is hover-gated where there is no hover: on a phone the control is
 * simply always there, because a thumb cannot reveal anything.
 *
 * Pure — no DOM, no React. Which pointer is where belongs to the component;
 * what that adds up to belongs here, where it can be tested.
 */

export type HoverReveal = {
  /** There is something for the control to do — no handler, no affordance. */
  hasHandler: boolean;
  /** Hover exists at all. False on phone, where the control is permanent. */
  isDesktop: boolean;
  /** The pointer is over the surface the control belongs to. */
  onSurface: boolean;
  /** The pointer is over the control itself — reaching for it is still being on it. */
  onControl: boolean;
};

export function showsHoverControl({ hasHandler, isDesktop, onSurface, onControl }: HoverReveal): boolean {
  if (!hasHandler) return false;
  if (!isDesktop) return true;
  return onSurface || onControl;
}
