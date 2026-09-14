import { Redirect, Tabs } from 'expo-router';

import { AppChrome } from '@/components/layout/AppChrome';
import { useAuth } from '@/features/auth/AuthProvider';
import { CellarSheets } from '@/features/cellar/CellarSheets';

/**
 * The tab shell. Navigation is the app's only chrome and it comes in two
 * shapes — the floating islands on a phone, the sidebar on desktop web
 * (components/layout/AppChrome) — both of which drive themselves off the route
 * rather than off this navigator, so they can also render on screens pushed out
 * of the tabs.
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
        tabBar={() => <AppChrome />}
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
