import { Pencil } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * The handle for rewording a thought, beside the stamp and the copy prompt.
 *
 * Caption-sized and muted for the same reason `CopyPrompt` is: it is something
 * you reach for knowing it is there, and the thought is the loudest thing on
 * the page (PING.md §2.3).
 */
export function EditThought({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="reword this thought"
      hitSlop={8}
      onPress={onPress}
      className="flex-row items-center gap-1.5 self-start active:opacity-60"
    >
      <Pencil size={12} color={COLORS.muted} strokeWidth={2} />
      <Text className="text-xs text-muted-foreground">edit</Text>
    </Pressable>
  );
}
