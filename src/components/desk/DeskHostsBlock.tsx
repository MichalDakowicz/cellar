import { Text, View } from 'react-native';
import { COLORS } from '@/theme/colors';

/** Controller host status. Pairing and account mailbox choose the remote PC. */
export function DeskHostsBlock({ name, online, line }: { name: string; online: boolean; line: string }) {
  return <View className="gap-4">
    <View className="flex-row items-center gap-3 rounded-xl bg-row p-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-sans text-base font-bold text-foreground">{name}</Text>
        <Text className="font-sans text-xs text-muted-foreground">remote pc · controller connection</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: online ? COLORS.ok : COLORS.mutedDeep }} />
        <Text className="font-sans text-xs text-foreground">{line}</Text>
      </View>
    </View>
    <Text className="font-sans text-sm text-muted-foreground">Choose or forget your PC in devices. SSH hosts unavailable.</Text>
  </View>;
}
