import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsDesktop } from '@/hooks/useResponsive';

/** Top air on desktop web, where there is no status bar to inset past. */
const DESKTOP_TOP = 28;

/**
 * Status-bar clearance. There is no header anywhere in a Ping app, so every
 * screen owns its own inset — this is the first line of every screen body.
 *
 * `extra` is the breathing room above the screen's first control — pass 0 on a
 * screen whose first element is meant to run to the top.
 *
 * On desktop web `insets.top` is 0, so the phone value would print a heading 8px
 * from the top edge of the browser window with the tab strip directly above it.
 * The desktop floor replaces the inset rather than adding to it, so a screen
 * that asked for no breathing room still gets none.
 */
export function ScreenTop({ extra = 8 }: { extra?: number }) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();
  const top = isDesktop ? Math.max(insets.top, DESKTOP_TOP) : insets.top;
  return <View style={{ height: top + extra }} />;
}
