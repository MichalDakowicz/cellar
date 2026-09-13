import { type Href } from 'expo-router';
import { ChartColumn, CircleUserRound, Inbox, LayoutGrid, Plus } from 'lucide-react-native';
import { type ReactNode } from 'react';

/**
 * The five destinations, in bar order.
 *
 * Capture is the *first* slot and the app's home route, which is the one place
 * Cellar departs from its siblings: Radar opens on a shelf because looking is
 * what you came to do, and Cellar opens on an empty field because catching a
 * thought before it goes is what you came to do. A capture screen you have to
 * navigate to has already lost.
 *
 * There is no Social slot. A half-formed idea about an unreleased app is not a
 * thing you publish to a friends feed (docs/shared-database.md), so the fourth
 * destination is the Inbox — the pile of thoughts that have no project yet —
 * which is the screen this app actually needs a badge on.
 */
export type NavDestination = {
  href: Href;
  label: string;
  /** Route name in (tabs) — the key the navigator uses. */
  tabName: string;
  icon: (color: string, size: number) => ReactNode;
  /**
   * Route-driven, because the bar also renders on routes pushed *out* of the
   * tabs. Those keep their parent destination lit — you have not left the shelf
   * just because you opened a project.
   */
  isActive: (pathname: string) => boolean;
};

export const NAV_DESTINATIONS: NavDestination[] = [
  {
    href: '/',
    label: 'dump',
    tabName: 'index',
    icon: (color, size) => <Plus color={color} size={size} />,
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/shelf',
    label: 'projects',
    tabName: 'shelf',
    // A project's detail page, an entry, and search are all pushed from here.
    isActive: (pathname) =>
      pathname.startsWith('/shelf') || pathname.startsWith('/project') || pathname.startsWith('/search'),
    icon: (color, size) => <LayoutGrid color={color} size={size} />,
  },
  {
    href: '/inbox',
    label: 'inbox',
    tabName: 'inbox',
    icon: (color, size) => <Inbox color={color} size={size} />,
    isActive: (pathname) => pathname.startsWith('/inbox'),
  },
  {
    href: '/stats',
    label: 'stats',
    tabName: 'stats',
    icon: (color, size) => <ChartColumn color={color} size={size} />,
    isActive: (pathname) => pathname.startsWith('/stats'),
  },
  {
    href: '/profile',
    label: 'profile',
    tabName: 'profile',
    icon: (color, size) => <CircleUserRound color={color} size={size} />,
    isActive: (pathname) => pathname.startsWith('/profile') || pathname.startsWith('/settings'),
  },
];

/** Which destination owns the current route, or null on a route no tab claims. */
export function activeTabFor(pathname: string): string | null {
  return NAV_DESTINATIONS.find((destination) => destination.isActive(pathname))?.tabName ?? null;
}

/**
 * Routes that live *above* a tab rather than in it. They keep their parent
 * destination lit, but the left island becomes Back — which is why no pushed
 * screen in this app draws a back button of its own.
 */
export function isPushedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/entry/') ||
    pathname.startsWith('/project/') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/settings')
  );
}
