import { Redirect, Tabs } from 'expo-router';

import { NavIslands } from '@/components/layout/NavIslands';
import { useAuth } from '@/features/auth/AuthProvider';
import { CellarSheets } from '@/features/cellar/CellarSheets';

/**
 * The tab shell. The bar is the nav islands on every viewport, phone and
 * desktop web alike — it is the app's only navigation chrome, and it drives
 * itself off the route rather than off this navigator so it can also render on
 * screens pushed out of the tabs.
 *
 * `index` is the capture screen, not a shelf: the thing you open this app to do
 * is catch a thought before it goes.
 */
export default function TabsLayout() {
  const { user } = useAuth();

  if (!user) return <Redirect href="/login" />;

  return (
    <>
      <Tabs
        tabBar={() => <NavIslands />}
        // No scene animation: react-navigation cross-fades over the navigator's
        // own background, which flashes white on every swap. The movement that
        // makes a tab change feel smooth lives in the bar, where the marker
        // slides between destinations.
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'hsl(0 0% 3.9%)' } }}
      >
        <Tabs.Screen name="index" options={{ title: 'dump' }} />
        <Tabs.Screen name="shelf" options={{ title: 'projects' }} />
        <Tabs.Screen name="inbox" options={{ title: 'inbox' }} />
        <Tabs.Screen name="stats" options={{ title: 'stats' }} />
        <Tabs.Screen name="profile" options={{ title: 'profile' }} />
      </Tabs>
      {/* One instance of each sheet for the whole app, so the nav island and a
          row's own button open the same one (PING.md §9.8). */}
      <CellarSheets />
    </>
  );
}
