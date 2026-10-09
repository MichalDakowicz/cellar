import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/** Rows to screens that are drawn ahead of their wiring, on the desk tab. */
export function DeskLaterLinks({ links }: { links: { title: string; sub: string; onPress: () => void }[] }) {
  return (
    <View>
      {links.map((link) => (
        <Pressable
          key={link.title}
          accessibilityRole="button"
          accessibilityLabel={link.title}
          onPress={link.onPress}
          className="flex-row items-center gap-3 py-2.5 active:opacity-70"
        >
          <View className="min-w-0 flex-1">
            <Text className="text-sm text-foreground">{link.title}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">{link.sub}</Text>
          </View>
          <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      ))}
    </View>
  );
}
