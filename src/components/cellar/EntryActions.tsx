import { Trash } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * The three ways off a thought: move it, archive it, delete it — in that order
 * and at those weights on purpose.
 *
 * Archive is the primary and delete is the small red one on the end. Google
 * Keep's failure is that clearing a note means destroying it, so you either
 * keep a list you can no longer read or you lose the thought; here archive is
 * the easy one and delete is the rare, deliberate act.
 */
export function EntryActions({
  archiveLabel,
  onMove,
  onArchive,
  onDelete,
}: {
  archiveLabel: string;
  onMove: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <View className="mt-7 flex-row gap-2.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="move to another project"
          onPress={onMove}
          className="h-11 flex-1 items-center justify-center rounded-full bg-secondary active:opacity-80"
        >
          <Text className="text-sm font-semibold text-foreground">move</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={archiveLabel}
          onPress={onArchive}
          className="h-11 flex-1 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: COLORS.accentSoft }}
        >
          <Text className="text-sm font-semibold text-primary">{archiveLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="delete this entry"
          hitSlop={6}
          onPress={onDelete}
          className="h-11 w-11 items-center justify-center rounded-full active:opacity-80"
          style={{ backgroundColor: COLORS.dangerSoft }}
        >
          <Trash size={16} color={COLORS.danger} strokeWidth={2} />
        </Pressable>
      </View>
      <Text className="mt-3 text-xs text-muted-foreground">
        archiving takes it out of the project and the inbox without losing it. search still finds it, and it comes back.
      </Text>
    </>
  );
}
