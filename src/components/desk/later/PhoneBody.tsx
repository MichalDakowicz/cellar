import { Circle, Keyboard, Power, RotateCw, Square, Triangle, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { SamplePhoneMirror } from '@/components/desk/SamplePhoneMirror';
import { Overline, Segmented, SwitchRow } from '@/components/ui/controls';
import { useIsDesktop } from '@/hooks/useResponsive';
import type { SAMPLE_PHONE } from '@/lib/deskSample';
import { COLORS } from '@/theme/colors';

import { PhoneTools, Pill } from './PhoneTools';

const LEVEL: Record<string, string> = { E: COLORS.danger, W: '#f59e0b', I: COLORS.muted };
const CONTROLS: [string, LucideIcon][] = [['android back', Triangle], ['android home', Circle], ['recent apps', Square], ['rotate', RotateCw], ['type on the phone', Keyboard], ['screen off', Power]];

/** DeskPhone's two-column sample layout. No ADB commands are sent in the visual pass. */
export function PhoneBody({ phone }: { phone: typeof SAMPLE_PHONE }) {
  const [driver, setDriver] = useState<'watch' | 'me' | 'agent'>('agent');
  const isDesktop = useIsDesktop();
  return (
    <View className={`gap-8 ${isDesktop ? 'flex-row items-start' : ''}`}>
      <View className={`items-center gap-3.5 ${isDesktop ? 'w-[360px]' : ''}`}>
        <View className="w-full"><Segmented label="who drives the phone" value={driver} onChange={setDriver} options={[{ value: 'watch', label: 'just watch' }, { value: 'me', label: 'i drive' }, { value: 'agent', label: 'agent drives' }]} /></View>
        <SamplePhoneMirror width={isDesktop ? 300 : 280} driving={driver === 'agent'} />
        <View className="flex-row flex-wrap justify-center gap-2">{CONTROLS.map(([label, Icon]) => <View key={label} accessibilityLabel={`${label} · visual only`} className="h-9 w-9 items-center justify-center rounded-full border border-border"><Icon size={16} color={COLORS.foreground} /></View>)}</View>
        <Text className="font-sans text-center text-xs text-muted-foreground">drag on the mirror to swipe · scroll wheel scrolls · ctrl v pastes into the phone</Text>
      </View>
      <View className="min-w-0 flex-1 gap-7">
        <PhoneTools phone={phone} />
        <View className="flex-row flex-wrap items-start gap-7">
          <View className="min-w-[240px] flex-[3] gap-2.5">
            <View className="flex-row items-center gap-2"><Overline className="flex-1">logcat · com.ping.cellar</Overline><Text className="font-sans text-xs text-muted-foreground">all · info+ · errors</Text></View>
            <ScrollView horizontal className="rounded-xl border border-border/50 bg-background" contentContainerClassName="p-3.5"><View>{phone.log.map((line) => <Text key={line.at} className="font-mono text-xs leading-5 text-foreground"><Text className="font-sans text-muted-foreground">{line.at} </Text><Text style={{ color: LEVEL[line.level] }}>{line.level} </Text>{line.text}</Text>)}</View></ScrollView>
            <View className="flex-row flex-wrap items-center gap-2"><Pill label="send these lines to claude" /><Text className="font-sans text-sm text-muted-foreground">pause · clear</Text></View>
          </View>
          <View className="min-w-[240px] flex-[2] gap-3">
            <Overline>phone settings over adb</Overline>
            {phone.toggles.map((label) => <SwitchRow key={label} label={label} value={false} onChange={() => {}} disabled />)}
            <Text className="font-sans text-sm text-foreground">network · normal / slow / offline</Text>
            <Text className="font-sans text-sm text-foreground">font size · 1× / 1.3× / 2×</Text>
            <View className="gap-1.5 border-t border-border/50 pt-3"><Overline>agents on this phone</Overline><Text className="font-sans text-sm text-foreground">agents may install, tap, swipe and take screenshots. never uninstall, or read notifications and messages.</Text><Text className="font-sans text-xs text-muted-foreground">same switch as “let agents test on my phone” in settings</Text></View>
          </View>
        </View>
        <Text className="font-sans text-xs text-muted-foreground">Sample phone · mirror and controls are drawn until the PC talks ADB.</Text>
      </View>
    </View>
  );
}
