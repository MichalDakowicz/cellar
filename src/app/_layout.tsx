import '@/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NAV_DESTINATIONS } from '@/components/layout/navDestinations';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useSessionRoute } from '@/features/auth/useSessionRoute';
import { CellarDisplay } from '@/features/cellar/CellarDisplay';
import { CellarLive } from '@/features/cellar/CellarLive';
import { QuestionSync } from '@/features/notifications/QuestionSync';
import { useWebShortcuts } from '@/hooks/useWebShortcuts';
// Imported for its side effect: the background task has to be defined at
// module scope so a headless launch can find it by name.
import '@/lib/blockedWatchTask';
import { queryClient } from '@/lib/queryClient';
import { useCaptureFocus } from '@/store/cellarPrefs';
import { ThemeProvider } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  // Above the Stack, so it also covers settings, search, an entry and a project
  // — the screens pushed out of the tabs, where the tabs navigator's own
  // <Redirect> never runs.
  useSessionRoute();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Nothing mounts until auth resolves, so no screen ever renders a signed-out
  // shape and then swaps.
  if (loading) return null;

  return <>{children}</>;
}

/**
 * Keyboard wiring for the browser build. It has to sit above the navigator so
 * the keys work on every route, not only on the five that are tabs.
 */
function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const requestCapture = useCaptureFocus((state) => state.request);

  const selectTab = useCallback(
    (index: number) => {
      const destination = NAV_DESTINATIONS[index];
      if (destination) router.navigate(destination.href);
    },
    [router],
  );

  const capture = useCallback(() => {
    router.navigate('/');
    requestCapture();
  }, [router, requestCapture]);

  const search = useCallback(() => router.navigate('/search'), [router]);

  useWebShortcuts({ onSelectTab: selectTab, onCapture: capture, onSearch: search });

  return <>{children}</>;
}

/**
 * The shell, top to bottom. There is no header anywhere in this app — the nav
 * islands are the only chrome, and every screen starts with its own ScreenTop.
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <ToastProvider>
                <AuthGate>
                  <CellarLive />
                  <QuestionSync />
                  <CellarDisplay>
                    <AppShell>
                      <Stack screenOptions={{ headerShown: false }} />
                    </AppShell>
                  </CellarDisplay>
                </AuthGate>
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
