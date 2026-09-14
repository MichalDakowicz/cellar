import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';

import { useCellarSettings } from '@/hooks/useCellarSettings';
import {
  ensureNotificationPermission,
  hasNotificationPermission,
  supportsNotifications,
} from '@/lib/notificationSetup';

/**
 * The settings row for question banners: the stored preference and the OS
 * permission behind it, as one switch.
 *
 * They have to be one control. A toggle that is on while Android has the
 * permission revoked is a switch that lies, and the user's conclusion is that
 * the feature is broken rather than that they said no to a prompt six weeks
 * ago. So turning it on asks, and a refusal sends them to the system settings
 * where the real answer lives.
 *
 * `granted` is null until the first check lands, so the sub-line can stay quiet
 * rather than flashing "blocked" at someone who already allowed it.
 */
export function useQuestionNotices() {
  const { settings, updateSettings } = useCellarSettings();
  const [granted, setGranted] = useState<boolean | null>(supportsNotifications ? null : false);

  useEffect(() => {
    let alive = true;
    // Reading the OS is subscribing to an external system, so the state lands
    // in the callback rather than in the effect body — and a check still in
    // flight when the screen closes must not set state on the way out.
    const read = async () => {
      const allowed = await hasNotificationPermission();
      if (alive) setGranted(allowed);
    };
    void read();
    // The only way back from Android's app-info screen is the app foregrounding
    // again, so that is what triggers the re-check.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void read();
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const set = useCallback(
    async (wanted: boolean) => {
      if (!wanted) {
        await updateSettings({ notifyQuestions: false });
        return;
      }

      const allowed = await ensureNotificationPermission();
      setGranted(allowed);
      await updateSettings({ notifyQuestions: allowed });
      // Android stops honouring the prompt after two refusals; the switch would
      // otherwise sit there doing nothing with no way to find out why.
      if (!allowed) await Linking.openSettings().catch(() => undefined);
    },
    [updateSettings],
  );

  const sub = !supportsNotifications
    ? 'the browser build has no banners — the inbox still badges'
    : granted === false
      ? 'android is blocking notifications for cellar — tap to open its settings'
      : settings.notifyQuestions
        ? 'a banner when a blocked question appears, checked hourly in the background'
        : 'questions still wait in the inbox with a badge, just quietly';

  return { granted, set, sub };
}
