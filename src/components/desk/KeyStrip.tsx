import { Pressable, Text, View } from 'react-native';

import type { DeskKey } from '@/lib/deskKeys';
import { COLORS } from '@/theme/colors';

const KEYS: { key: DeskKey; label: string }[] = [
  { key: '@', label: 'point at a file' },
  { key: '$', label: 'a cellar entry or command' },
  { key: '/', label: "one of the agent's skills" },
];

/**
 * `@ $ /` in a strip over the keyboard, so the symbols are never dug for
 * (docs/desk/keys.md). The key whose list is open is lit.
 */
export function KeyStrip({ active, onKey }: { active: DeskKey | null; onKey: (key: DeskKey) => void }) {
  return (
    <View className="flex-row gap-1.5">
      {KEYS.map((key) => {
        const on = key.key === active;
        return (
          <Pressable
            key={key.key}
            accessibilityRole="button"
            accessibilityLabel={key.label}
            accessibilityState={{ selected: on }}
            onPress={() => onKey(key.key)}
            className={`h-10 flex-1 items-center justify-center rounded-[10px] border active:opacity-70 ${on ? 'border-primary' : 'border-transparent bg-secondary'}`}
            style={on ? { backgroundColor: COLORS.accentSoft } : undefined}
          >
            <Text className="font-mono text-[17px] font-semibold text-foreground">{key.key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
