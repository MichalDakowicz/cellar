import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

import { CHANNELS, ensureNotificationChannels, NOTIFICATION_ACCENT } from '@/lib/notificationChannels';
import { hasNotificationPermission, supportsNotifications } from '@/lib/notificationSetup';
import { nextSeen, pendingNotices } from '@/lib/questionNotices';
import type { Entry, Project } from '@/types/cellar';

/**
 * Raises a banner for a question an agent has stopped on.
 *
 * Local notifications, the way Pulsar's reminders are — presented by this
 * device, not pushed to it. There is no Expo push token, no `device_tokens`
 * row, no edge function and no FCM credential anywhere in this path. What it
 * costs instead is latency: a question only becomes a banner the next time the
 * app is opened or the OS wakes it (`blockedWatchTask`), which on Android is
 * every few hours rather than every few seconds.
 *
 * That trade is the right one here. The question is a thing to answer today,
 * not a message to reply to, and it is already visible in the inbox with a
 * badge the moment the app is opened.
 *
 * Which notices are owed is decided in `questionNotices.ts`, which is pure.
 * This module only talks to the OS and remembers what it has already said.
 */

// Device-local: whether *this* handset has already shown a question. Not in
// cellar_settings, because the phone and the browser having separately shown it
// is correct — the notification is a property of the device, not the account.
const storage = createMMKV({ id: 'cellar-notices' });
const SEEN_KEY = 'shownQuestions';

function readSeen(): string[] {
  try {
    const raw = storage.getString(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeSeen(keys: string[]): void {
  storage.set(SEEN_KEY, JSON.stringify(keys));
}

/**
 * Shows anything not yet shown, and returns how many that was.
 *
 * Idempotent by design: it is called from the foreground on every cellar load
 * *and* from a background wake, and those two race constantly.
 */
export async function notifyBlockedQuestions(entries: Entry[], projects: Project[]): Promise<number> {
  if (!supportsNotifications) return 0;
  if (!(await hasNotificationPermission())) return 0;

  const seen = readSeen();
  const owed = pendingNotices(entries, projects, seen);

  if (owed.length > 0) {
    await ensureNotificationChannels();
    for (const notice of owed) {
      await Notifications.scheduleNotificationAsync({
        identifier: notice.key,
        content: {
          title: notice.title,
          body: notice.body,
          color: NOTIFICATION_ACCENT,
          // Read by the tap handler, so a tap opens the entry rather than the app.
          data: { entryId: notice.entryId },
          ...(Platform.OS === 'android' ? { channelId: CHANNELS.questions } : null),
        },
        // Null is "now". The waiting already happened; this is the delivery.
        trigger: null,
      });
    }
  }

  // Written even when nothing was owed: this is also what forgets the keys of
  // questions that have since been answered.
  writeSeen(nextSeen(entries, seen, owed.map((notice) => notice.key)));
  return owed.length;
}
