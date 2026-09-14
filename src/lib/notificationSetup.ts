import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { ensureNotificationChannels } from '@/lib/notificationChannels';

// The one place setNotificationHandler is called. It is a global, last-write-
// wins registration, so a second module setting its own would silently decide
// the behaviour of every notification in the app.

export const supportsNotifications = Platform.OS !== 'web';

if (supportsNotifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // Cellar raises one kind of notification and it is always something
      // waiting on the user, so all of them are banners.
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/**
 * Asks once for POST_NOTIFICATIONS (Android 13+), creating the channel first so
 * the system prompt has something to describe. A refusal is never fatal — the
 * questions still land in the inbox with a badge on the tab, which is where the
 * user would look anyway.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    await ensureNotificationChannels();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch (error) {
    console.warn('Notification permission check failed', error);
    return false;
  }
}

/** Whether notifications are already allowed, without prompting for them. */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}
