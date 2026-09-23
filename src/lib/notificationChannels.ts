import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Android routes every notification through a channel, and the channel — not
// the message — owns whether it makes a sound, vibrates, or is allowed to
// interrupt. Two kinds, two channels: an agent waiting on you, and a nudge
// about a thought left alone — so the system settings can silence one without
// the other.

export const CHANNELS = {
  questions: 'questions',
  nudges: 'nudges',
} as const;

export type ChannelId = (typeof CHANNELS)[keyof typeof CHANNELS];

/** Cellar's slate. The one place a hex is allowed outside theme/colors. */
export const NOTIFICATION_ACCENT = '#64748b';

const { AndroidImportance } = Notifications;

const SPECS = [
  {
    id: CHANNELS.questions,
    name: 'Questions',
    // DEFAULT rather than HIGH: an agent has stopped and is waiting, which is
    // worth knowing about today and is never worth interrupting something for.
    description: 'When an agent working on one of your projects stops to ask you something',
    importance: AndroidImportance.DEFAULT,
    showBadge: true,
  },
  {
    id: CHANNELS.nudges,
    name: 'Nudges',
    // LOW: a nudge is a reminder, not an interruption — it lands in the shade
    // without a sound, and never badges over a question that is really waiting.
    description: 'When a thought you dumped has sat untouched past the days you picked',
    importance: AndroidImportance.LOW,
    showBadge: false,
  },
];

let ready: Promise<void> | null = null;

/**
 * Idempotent and memoised: creating a channel that exists only updates it, but
 * the calls are not free and this runs on every app start and every background
 * wake.
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  ready ??= Promise.all(
    SPECS.map((spec) =>
      Notifications.setNotificationChannelAsync(spec.id, {
        name: spec.name,
        description: spec.description,
        importance: spec.importance,
        showBadge: spec.showBadge,
        lightColor: NOTIFICATION_ACCENT,
      }),
    ),
  ).then(() => undefined);
  return ready;
}
