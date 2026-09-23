import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { useCellarSettings } from '@/hooks/useCellarSettings';

/**
 * A tap under the thumb for the two moments that happen without looking: a
 * hold that starts a selection, and a thought landing. Nothing else buzzes — a
 * phone that answers every chip is a phone you turn this off on.
 *
 * Off on the web, where there is nothing to vibrate, and when the setting is
 * off. Every call swallows its own failure: a haptic engine that is busy or
 * missing must never be why a drop looked like it failed.
 */
export function useHaptics() {
  const { settings } = useCellarSettings();
  const on = settings.haptics && Platform.OS !== 'web';

  return useMemo(
    () => ({
      hold: () => {
        if (on) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
      },
      drop: () => {
        if (on) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      },
    }),
    [on],
  );
}
