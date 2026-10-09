import { X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { COLORS } from '@/theme/colors';

/**
 * "from your cellar" on the new-task screen: the thought the run picks up. The
 * agent claims it and writes what it did back under it, so it is named here
 * before you send — and can be let go of, leaving just what you typed.
 */
export function AttachedThought({ text, kind, onDetach }: { text: string; kind: string; onDetach: () => void }) {
  return (
    <View className="gap-2.5">
      <Overline>from your cellar</Overline>
      <View className="flex-row items-center gap-3 rounded-xl bg-secondary/60 py-2.5 pl-3 pr-1.5">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {text}
          </Text>
          <Text className="text-xs text-muted-foreground">{kind} · the agent claims it and appends what it did</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="leave this thought out"
          hitSlop={6}
          onPress={onDetach}
          className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
        >
          <X size={16} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
