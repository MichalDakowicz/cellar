import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { NavIslands } from '@/components/layout/NavIslands';
import { useIsDesktop } from '@/hooks/useResponsive';

/**
 * The app's navigation, in whichever shape the viewport asks for: the floating
 * islands on a phone, the spelled-out sidebar on desktop web.
 *
 * Every screen mounts exactly one of these — the tabs layout for the five
 * destinations, and each route pushed out of the tabs for itself, because a
 * pushed screen covers the navigator and would otherwise have no navigation at
 * all (which is also where the islands' left plate becomes Back).
 *
 * Both shapes are absolutely positioned and reserve no layout, so a screen pads
 * for them with `useNavBarSpace` at the bottom and `useSidebarSpace` on the left.
 */
export function AppChrome() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopSidebar /> : <NavIslands />;
}
