import { Plus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * Settings › desk › hosts (`DeskHosts.dc.html`). This pc only: other hosts
 * over ssh wait until the server is actually set up (docs/desk/TASKS.md W20),
 * so the way to add one is shown and switched off, with the reason.
 */
export function DeskHostsBlock({ name, online, line }: { name: string; online: boolean; line: string }) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-3 rounded-xl bg-secondary/60 px-3.5 py-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-base font-bold text-foreground">{name}</Text>
          <Text className="text-xs text-muted-foreground">this pc · every project</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: online ? COLORS.ok : COLORS.muted }} />
          <Text className="text-xs text-muted-foreground">{line}</Text>
        </View>
      </View>
      <View
        accessibilityLabel="add a host over ssh — after the server is set up"
        className="h-12 flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-border opacity-50"
      >
        <Plus size={16} color={COLORS.muted} strokeWidth={2} />
        <Text className="text-sm text-muted-foreground">add a host over ssh — after the server is set up</Text>
      </View>
    </View>
  );
}
