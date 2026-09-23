import { Linking, Text, View } from 'react-native';

import { Segmented, SwitchRow } from '@/components/ui/controls';
import { useQuestionNotices } from '@/features/notifications/useQuestionNotices';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { ensureNotificationPermission, supportsNotifications } from '@/lib/notificationSetup';
import { NUDGE_DAYS, NUDGES_PER_DAY } from '@/lib/nudges';

/**
 * The nudge switch, and the two numbers behind it: how long a thought sits
 * before it is worth a banner, and how many banners a day. Checked on the same
 * hourly background wake as agent questions, with its own switch so either can
 * be off without the other.
 */
export function NudgeSettings() {
  const { settings, updateSettings } = useCellarSettings();
  // The OS permission, read the same way the question switch reads it: a
  // switch that says on while Android blocks the banners is a switch that lies.
  const { granted } = useQuestionNotices();
  const on = settings.notifyNudges && supportsNotifications && granted !== false;

  const toggle = async (wanted: boolean) => {
    if (!wanted) {
      await updateSettings({ notifyNudges: false });
      return;
    }
    // Turning it on is the moment to ask; a refusal sends you to the one place
    // the real answer lives, and leaves the switch off rather than on and silent.
    const allowed = await ensureNotificationPermission();
    await updateSettings({ notifyNudges: allowed });
    if (!allowed) await Linking.openSettings().catch(() => undefined);
  };

  return (
    <>
      <SwitchRow
        label="nudge me about old thoughts"
        sub={
          !supportsNotifications
            ? 'the browser build has no banners'
            : granted === false
              ? 'android is blocking notifications for cellar — tap to open its settings'
              : 'a quiet banner when something you dumped has sat untouched, unfiled ideas first'
        }
        value={on}
        onChange={(value) => void toggle(value)}
        disabled={!supportsNotifications}
      />
      {on && (
        <View className="gap-3 pb-4">
          <Text className="text-xs text-muted-foreground">untouched for</Text>
          <Segmented<string>
            label="untouched for"
            value={String(settings.nudgeDays)}
            onChange={(value) => void updateSettings({ nudgeDays: Number(value) })}
            options={NUDGE_DAYS.map((days) => ({ value: String(days), label: `${days}d` }))}
          />
          <Text className="text-xs text-muted-foreground">at most a day — more than that go out as one</Text>
          <Segmented<string>
            label="nudges a day"
            value={String(settings.nudgesPerDay)}
            onChange={(value) => void updateSettings({ nudgesPerDay: Number(value) })}
            options={NUDGES_PER_DAY.map((count) => ({ value: String(count), label: String(count) }))}
          />
        </View>
      )}
    </>
  );
}
