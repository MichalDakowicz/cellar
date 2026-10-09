import { useState } from 'react';
import { Text, View } from 'react-native';

import { Overline, Segmented, SwitchRow } from '@/components/ui/controls';
import type { SAMPLE_PHONE } from '@/lib/deskSample';
import { COLORS } from '@/theme/colors';

type Phone = typeof SAMPLE_PHONE;
type Driver = 'watch' | 'me' | 'agent';

const LEVEL: Record<string, string> = { E: COLORS.danger, W: COLORS.muted, I: COLORS.mutedDeep };

/**
 * The phone on the pc over adb (`DeskPhone.dc.html`): who drives, the mirror,
 * install and deep links, logcat and the dev toggles. Drawn until the pc
 * attaches a phone (docs/desk/TASKS.md W18); the agent-access switch is the
 * one in cellar's settings, so it is not repeated here.
 */
export function PhoneBody({ phone }: { phone: Phone }) {
  const [driver, setDriver] = useState<Driver>('agent');

  return (
    <View className="gap-6">
      <Segmented<Driver>
        label="who drives the phone"
        value={driver}
        onChange={setDriver}
        options={[
          { value: 'watch', label: 'just watch' },
          { value: 'me', label: 'i drive' },
          { value: 'agent', label: 'agent drives' },
        ]}
      />
      <View className="aspect-[9/16] w-[180px] items-center justify-center gap-2 self-center rounded-[26px] border-2 border-border bg-secondary/60 px-4">
        <Text className="text-center text-xs text-muted-foreground">
          {driver === 'agent' ? 'the agent is driving — its taps show as rings' : driver === 'me' ? 'click to tap, drag to swipe' : 'watching only'}
        </Text>
      </View>

      <View className="gap-2">
        <Overline>install and open</Overline>
        <Text className="font-mono text-sm text-foreground">{phone.apk.file}</Text>
        <Text className="text-xs text-muted-foreground">{phone.apk.line}</Text>
        <Text className="pt-1 text-xs text-muted-foreground">deep link</Text>
        <Text className="rounded-lg bg-secondary px-3 py-2 font-mono text-xs text-foreground">{phone.deepLink}</Text>
      </View>

      <View className="gap-1.5">
        <Overline>logcat</Overline>
        {phone.log.map((line) => (
          <Text key={line.at} className="font-mono text-xs text-foreground" numberOfLines={1}>
            <Text className="text-muted-foreground">{line.at} </Text>
            <Text style={{ color: LEVEL[line.level] }}>{line.level} </Text>
            {line.text}
          </Text>
        ))}
      </View>

      <View>
        <Overline>phone settings over adb</Overline>
        {phone.toggles.map((toggle) => (
          <SwitchRow key={toggle} label={toggle} value={false} onChange={() => {}} disabled />
        ))}
      </View>
    </View>
  );
}
