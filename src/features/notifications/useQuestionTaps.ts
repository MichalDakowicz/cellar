import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';

/**
 * expo-notifications' hook is native-only: on web it calls
 * `ExpoNotifications.getLastNotificationResponse`, which does not exist there
 * and throws during render, taking the whole app down before the first screen
 * paints.
 *
 * Picking the implementation once at module load keeps the call site an
 * ordinary unconditional hook — `Platform.OS` cannot change between renders.
 */
const useLastNotificationResponse: () => Notifications.NotificationResponse | null | undefined =
  Platform.OS === 'web' ? () => null : Notifications.useLastNotificationResponse;

/**
 * Opens the entry a tapped question belongs to.
 *
 * A notification that drops you on the capture screen has wasted the trip: the
 * whole content of the banner is one specific thought waiting on one specific
 * answer.
 *
 * `ready` gates it because a cold start from a notification resolves auth and
 * the tap at about the same moment, and routing to an entry before there is a
 * session renders the "that entry is gone" empty state.
 */
export function useQuestionTaps(ready: boolean): void {
  const response = useLastNotificationResponse();
  const router = useRouter();
  // The hook keeps handing back the same response; without this the route is
  // pushed again on every render that follows.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !response) return;

    const id = response.notification.request.identifier;
    if (handled.current === id) return;

    const entryId = response.notification.request.content.data?.entryId;
    if (typeof entryId !== 'string' || !entryId) return;

    handled.current = id;
    router.navigate(`/entry/${entryId}`);
  }, [ready, response, router]);
}
