import { MonitorUp } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * The other half of "copy a prompt": instead of carrying the line to an agent,
 * send it to one on the pc.
 *
 * Same size, same mute, same row as the copy control (PING.md §2.3) — it is the
 * same act with the paste taken out, and it only appears once a pc is paired.
 */
export function StartOnPc({ onPress, name }: { onPress: () => void; name: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`start this on ${name}`}
      hitSlop={8}
      onPress={onPress}
      className="flex-row items-center gap-1.5 self-start active:opacity-60"
    >
      <MonitorUp size={12} color={COLORS.muted} strokeWidth={2} />
      <Text className="text-xs text-muted-foreground">start on pc</Text>
    </Pressable>
  );
}
