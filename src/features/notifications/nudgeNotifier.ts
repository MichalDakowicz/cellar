import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createMMKV } from 'react-native-mmkv';

import { CHANNELS, ensureNotificationChannels, NOTIFICATION_ACCENT } from '@/lib/notificationChannels';
import { hasNotificationPermission, supportsNotifications } from '@/lib/notificationSetup';
import { nudgesDue, staleThoughts, type NudgeCandidate, type NudgeLedger } from '@/lib/nudges';

/**
 * Raises the nudges `lib/nudges` says are owed, and remembers that it did.
 *
 * Device-local, like the question ledger: the phone having nudged you about an
 * idea says nothing about whether the browser should, and a ledger on the
 * account would let one device's banner silence another's.
 */
const storage = createMMKV({ id: 'cellar-nudges' });
const LEDGER_KEY = 'ledger';

function readLedger(): NudgeLedger {
  try {
    const raw = storage.getString(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as NudgeLedger) : [];
  } catch {
    return [];
  }
}

export async function notifyNudges(
  thoughts: NudgeCandidate[],
  input: { days: number; perDay: number; nameOf: (projectId: string | null) => string; now?: number },
): Promise<number> {
  if (!supportsNotifications) return 0;
  if (!(await hasNotificationPermission())) return 0;

  const now = input.now ?? Date.now();
  const { nudges, ledger } = nudgesDue(staleThoughts(thoughts, now, input.days), readLedger(), { ...input, now });

  if (nudges.length > 0) {
    await ensureNotificationChannels();
    for (const nudge of nudges) {
      await Notifications.scheduleNotificationAsync({
        identifier: nudge.key,
        content: {
          title: nudge.title,
          body: nudge.body,
          color: NOTIFICATION_ACCENT,
          // Read by the tap handler: one thought opens itself, a group opens its list.
          data: { route: nudge.route },
          ...(Platform.OS === 'android' ? { channelId: CHANNELS.nudges } : null),
        },
        trigger: null,
      });
    }
  }

  storage.set(LEDGER_KEY, JSON.stringify(ledger));
  return nudges.length;
}
