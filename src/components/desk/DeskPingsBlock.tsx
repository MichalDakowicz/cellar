import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { PING_RULES } from '@/lib/deskSettings';
import { COLORS } from '@/theme/colors';

/**
 * Settings › notifications, "where pings go" (`DeskHosts.dc.html`): one device
 * at a time, the first rule that fits wins — each rule numbered, when, where,
 * edit — then what pings at all. Drawn ahead of routing (W13); "see what they
 * look like" opens the previews built from what is real now.
 */
export function DeskPingsBlock({ onPreview }: { onPreview: () => void }) {
  return (
    <View className="gap-3">
      <Text className="font-sans text-sm text-muted-foreground">one device at a time. checked top to bottom; the first rule that fits wins.</Text>
      {PING_RULES.map((rule, index) => (
        <View key={rule.when} className="flex-row flex-wrap items-center gap-3 rounded-xl bg-row px-3 py-2.5">
          <Text className="w-5 font-mono text-xs text-muted-foreground">{index + 1}</Text>
          <Text className="font-sans min-w-[140px] flex-1 text-sm text-foreground">{rule.when}</Text>
          <Text className="font-sans min-w-[140px] flex-1 text-sm" style={{ color: COLORS.foregroundSoft }}>
            {rule.where}
          </Text>
          <Text className="font-sans px-3 text-[13px] text-muted-foreground opacity-60">edit</Text>
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={onPreview} className="mt-1 flex-row items-center gap-3 py-2 active:opacity-70">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm text-foreground">see what they look like</Text>
          <Text className="font-sans mt-0.5 text-xs text-muted-foreground">approvals and questions use the same actions in the shade</Text>
        </View>
        <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
