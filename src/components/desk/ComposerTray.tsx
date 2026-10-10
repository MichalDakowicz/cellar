import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/** Local presentation only; never a host acknowledgement or permission change. */
export function ComposerTray({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <View className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-secondary" style={{ zIndex: 6 }}>
      <View className="flex-row items-center gap-2 pl-3 pr-2 pt-2">
        <Text className="font-sans min-w-0 flex-1 text-sm font-semibold text-foreground">{title}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`close ${title}`} onPress={onClose} className="h-11 w-11 items-center justify-center rounded-lg"><X size={18} color={COLORS.foregroundSoft} /></Pressable>
      </View>
      <ScrollView className="max-h-[340px]" contentContainerClassName="gap-2 px-3 pb-3" keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </View>
  );
}
