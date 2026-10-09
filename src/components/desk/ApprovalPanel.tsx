import { Pressable, Text, View } from 'react-native';

import type { DeskApproval } from '@/lib/deskChat';
import { COLORS } from '@/theme/colors';

/**
 * What the agent will not do without you (`Run.dc.html`), pinned above the nav
 * in thumb reach. It replaces the composer until it is answered — there is
 * nothing else to say to a run that is waiting on this. The first answer wins,
 * wherever it comes from: here, the pc or the notification.
 */
export function ApprovalPanel({
  approval,
  onDecide,
}: {
  approval: DeskApproval;
  onDecide: (decision: 'allow' | 'always' | 'deny') => void;
}) {
  return (
    <View className="gap-2.5" accessibilityLabel="waiting on you">
      <View className="flex-row items-center gap-1.5">
        <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: COLORS.danger }} />
        <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.danger }}>
          waiting on you · {approval.what}
        </Text>
      </View>
      <View className="rounded-lg bg-secondary/60 px-3 py-2.5">
        <Text className="font-mono text-sm text-foreground" selectable>
          {approval.subject}
        </Text>
      </View>
      <Text className="text-xs text-muted-foreground">{approval.effect}</Text>
      <View className="mt-1 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => onDecide('deny')}
          className="h-[52px] flex-1 items-center justify-center rounded-full border border-border active:opacity-70"
        >
          <Text className="text-base font-semibold text-foreground">deny</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onDecide('allow')}
          className="h-[52px] flex-1 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <Text className="text-base font-semibold text-primary-foreground">allow</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => onDecide('always')}
        className="h-10 items-center justify-center rounded-full active:opacity-70"
      >
        <Text className="text-sm font-semibold text-muted-foreground">{approval.always}</Text>
      </Pressable>
    </View>
  );
}
