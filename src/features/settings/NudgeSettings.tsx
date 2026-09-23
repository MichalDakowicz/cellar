import { Text, View } from 'react-native';

import { Segmented, SwitchRow } from '@/components/ui/controls';
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

  const toggle = async (wanted: boolean) => {
    // Turning it on is the moment to ask; a refusal leaves the switch off rather
    // than on and silently doing nothing.
    const allowed = wanted ? await ensureNotificationPermission() : false;
    await updateSettings({ notifyNudges: wanted && allowed });
  };

  return (
    <>
      <SwitchRow
        label="nudge me about old thoughts"
        sub={
          supportsNotifications
            ? 'a quiet banner when something you dumped has sat untouched, unfiled ideas first'
            : 'the browser build has no banners'
        }
        value={settings.notifyNudges && supportsNotifications}
        onChange={(value) => void toggle(value)}
        disabled={!supportsNotifications}
      />
      {settings.notifyNudges && supportsNotifications && (
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
