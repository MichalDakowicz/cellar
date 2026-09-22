import { Copy } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * One tap, one paste: the line that starts this thing in an agent.
 *
 * The same control on an entry and on a project, because it is the same act —
 * and the two are a keystroke apart in the copied string, so a second version
 * of this row would be two behaviours wearing one icon.
 *
 * Caption-sized and muted, like the repo line it sits under. It is a handle you
 * reach for knowing it is there, never something competing with the entries
 * (PING.md §2.3).
 */
export function CopyPrompt({
  onPress,
  what,
  align = 'start',
}: {
  onPress: () => void;
  /** What lands on the clipboard, for the screen reader — "this entry", "this project". */
  what: string;
  /** `end` for the desktop project page, whose heading hangs off the right edge. */
  align?: 'start' | 'end';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`copy a prompt for ${what}`}
      hitSlop={8}
      onPress={onPress}
      className={[
        'flex-row items-center gap-1.5 active:opacity-60',
        align === 'end' ? 'self-end' : 'self-start',
      ].join(' ')}
    >
      <Copy size={12} color={COLORS.muted} strokeWidth={2} />
      <Text className="text-xs text-muted-foreground">copy a prompt</Text>
    </Pressable>
  );
}
