import { ImagePlus } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * The handle for the thought's own picture, beside the stamp and the copy
 * prompt. Says what it will do — add one, or replace the one there — and goes
 * quiet while a picture is being cut, so a second tap cannot open a second
 * picker.
 */
export function PictureAction({ has, busy, onPress }: { has: boolean; busy: boolean; onPress: () => void }) {
  const label = has ? 'replace picture' : 'add picture';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      hitSlop={8}
      onPress={onPress}
      className="flex-row items-center gap-1.5 self-start active:opacity-60"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      <ImagePlus size={12} color={COLORS.muted} strokeWidth={2} />
      <Text className="text-xs text-muted-foreground">{busy ? 'working…' : label}</Text>
    </Pressable>
  );
}
