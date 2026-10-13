import { Monitor, SlidersHorizontal } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/** Main revision 5: PC identity and connection belong above waiting items. */
export function DeskIdentity({ name, online, checking, summary, sample, onSettings }: {
  name: string; online: boolean; checking: boolean; summary: string; sample: boolean; onSettings: () => void;
}) {
  return (
    <View className="flex-row items-start gap-3 pt-2">
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center gap-2.5">
          <Monitor size={24} color={COLORS.muted} />
          <Text className="font-sans min-w-0 flex-1 text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>{name}</Text>
        </View>
        <View className="flex-row flex-wrap items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: online ? COLORS.ok : COLORS.mutedDeep }} />
          <Text className="font-sans text-xs text-foreground">{online ? 'connected' : checking ? 'connecting…' : 'disconnected'}</Text>
          {!!summary && <Text className="font-sans text-xs text-muted-foreground">· {summary}</Text>}
          {sample && <Text className="font-sans text-xs text-muted-foreground">· sample desk</Text>}
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="settings" onPress={onSettings} className="h-11 w-11 items-center justify-center rounded-full bg-secondary active:opacity-70">
        <SlidersHorizontal size={20} color={COLORS.foreground} />
      </Pressable>
    </View>
  );
}
