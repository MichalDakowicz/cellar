import { Text, View } from 'react-native';

import { stateMeta } from '@/lib/entryState';
import type { EntryState } from '@/types/cellar';

/**
 * The one badge. `open` is most of the cellar and is never badged — a marker on
 * almost every row is noise, so this renders nothing for it and the exception
 * is the only thing that catches the eye (PING.md §4.4).
 */
export function StateBadge({ state }: { state: EntryState }) {
  const meta = stateMeta(state);
  if (!meta.badged) return null;

  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: meta.tint }}>
      <Text className="text-[10px] font-bold" style={{ color: meta.color }} numberOfLines={1}>
        {meta.label}
      </Text>
    </View>
  );
}
