import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsDesktop } from '@/hooks/useResponsive';

/** Island height, and the gap it keeps from the screen edge and from content. */
export const NAV_ISLAND_HEIGHT = 52;
export const NAV_ISLAND_GAP = 10;

/**
 * Vertical space a scrolling body must leave at its bottom so its last row
 * clears the floating nav. The bar is absolutely positioned (that is what lets
 * the glass sit *over* posters), so it reserves no layout of its own and every
 * list has to pad for it.
 */
export function useNavBarSpace(): number {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  // Nothing floats over the bottom of a desktop window — navigation is the
  // sidebar — so a page only needs ordinary end-of-page air. Reserving the
  // island's 72px there is what left every screen with a dead strip.
  if (isDesktop) return 24;
  return insets.bottom + NAV_ISLAND_GAP * 2 + NAV_ISLAND_HEIGHT;
}
