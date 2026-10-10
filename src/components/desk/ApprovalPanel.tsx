import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

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
  const [more, setMore] = useState(false);
  return (
    <View className="gap-2.5" accessibilityLabel="waiting on you">
      <View className="flex-row items-center gap-1.5">
        <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: COLORS.danger }} />
        <Text className="font-sans text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.danger }}>
          waiting on you · {approval.what}
        </Text>
      </View>
      <View className="rounded-lg bg-row px-3 py-2.5">
        <Text className="font-mono text-sm text-foreground" selectable>
          {approval.subject}
        </Text>
      </View>
      <Text className="font-sans text-xs text-muted-foreground">{approval.effect}</Text>
      <View className="mt-1 flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => onDecide('deny')}
          className="h-[52px] flex-1 items-center justify-center rounded-lg border border-border active:opacity-70"
        >
          <Text className="font-sans text-base font-semibold text-foreground">deny</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onDecide('allow')}
          className="h-[52px] flex-1 items-center justify-center rounded-lg bg-foreground active:opacity-80"
        >
          <Text className="font-sans text-base font-semibold text-background">allow once</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => setMore(!more)}
        accessibilityState={{ expanded: more }}
        className="h-11 items-center justify-center rounded-lg border border-border active:opacity-70"
      >
        <Text className="font-sans text-sm font-semibold" style={{ color: COLORS.foregroundSoft }}>
          {more ? 'fewer options' : 'more options'}
        </Text>
      </Pressable>
      {more && <Pressable accessibilityRole="button" onPress={() => onDecide('always')} className="min-h-11 items-center justify-center rounded-lg border border-border px-3"><Text className="font-sans text-sm text-foreground">{approval.always}</Text></Pressable>}
    </View>
  );
}
