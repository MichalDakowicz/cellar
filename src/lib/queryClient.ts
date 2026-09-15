import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      // The backstop under the realtime subscription, and the browser's half of
      // it: a tab left open overnight may have lost the socket without the
      // client ever being told, and coming back to it is the one moment we know
      // the cache could be wrong. The phone's equivalent is the AppState hook in
      // `useCellarLive` — react-native has no window to focus.
      refetchOnWindowFocus: true,
    },
  },
});
