import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { NIGHT_SHIFT } from '@/lib/deskSettings';

import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';

/**
 * Settings › night shift (`DeskHosts.dc.html`): the window, where it runs, what
 * never runs at night, when it stops, and the digest. Drawn with the defaults
 * it will start from, until the night shift exists (docs/desk/TASKS.md W19).
 */
export function NightSettings() {
  const router = useRouter();
  return (
    <SettingsPage title="night shift" sub="tasks marked “tonight” run in a window while you sleep; a digest waits in the morning">
      <SettingsGroup>
        <Pressable accessibilityRole="button" className="min-h-11 justify-center" onPress={() => router.push('/desk/night')}><Text className="text-sm text-foreground">open night queue, window and morning digest</Text></Pressable>
        {NIGHT_SHIFT.map((row) => (
          <View key={row.label} className="flex-row items-start gap-4 py-1">
            <Text className="font-sans w-[140px] text-sm text-muted-foreground">{row.label}</Text>
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-1.5">
              {row.tokens?.map((token) => (
                <Text key={token} className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-foreground">
                  {token}
                </Text>
              ))}
              <Text className={row.tokens ? 'text-xs text-muted-foreground' : 'text-sm text-foreground'}>{row.value}</Text>
            </View>
          </View>
        ))}
        <Text className="font-sans pt-2 text-xs text-muted-foreground">Set each queue’s time window, run cap and reserve on the night shift screen. This PC must stay awake and signed in.</Text>
      </SettingsGroup>
    </SettingsPage>
  );
}
