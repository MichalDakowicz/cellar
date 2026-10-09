import { type Href } from 'expo-router';
import { ChartColumn, Inbox, LayoutGrid, Monitor, Plus } from 'lucide-react-native';
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
 *
 * The fifth is the desk, where every sibling has you (docs/desk/screens.md):
 * the right plate is the pc that runs your agents, badged with what is waiting
 * on you. Profile's leftovers — the account, the figures — live in settings.
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
    href: '/desk',
    label: 'desk',
    tabName: 'desk',
    icon: (color, size) => <Monitor color={color} size={size} />,
    // A run, the pc's pairing screens and settings are all pushed from here.
    isActive: (pathname) => pathname === '/desk' || isDeskChild(pathname) || pathname.startsWith('/settings'),
  },
];

/** `/desk/run/…`, `/desk-scan`, `/desk-pair` — above the desk tab, not the tab itself. */
function isDeskChild(pathname: string): boolean {
  return pathname.startsWith('/desk/') || pathname.startsWith('/desk-');
}

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
    pathname.startsWith('/settings') ||
    isDeskChild(pathname) ||
    pathname.startsWith('/arrange')
  );
}
