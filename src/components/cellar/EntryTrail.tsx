import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import type { TrailItem } from '@/lib/entryTrail';

/** How many of the latest moves show before "show all". */
const FOLDED = 6;

/**
 * What happened to this thought, and exactly when.
 *
 * The one place in the app a time is exact rather than "2d". A column of
 * stamps, then what happened, with the agent named when one did it — the
 * reading a thread cannot give, because a thread says what was said, not when
 * the thought moved.
 *
 * Folded to the latest few: a thought that has been worked for a week has a
 * trail longer than the thought, and the recent end is what you opened it for.
 */
export function EntryTrail({ items }: { items: (TrailItem & { stamp: string })[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const shown = open || items.length <= FOLDED ? items : items.slice(-FOLDED);
  const hidden = items.length - shown.length;

  return (
    <View className="mt-7">
      <View className="mb-2 flex-row items-center justify-between">
        <Overline>{`history · ${items.length}`}</Overline>
        {items.length > FOLDED && (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setOpen(!open)} className="active:opacity-70">
            <Text className="text-xs font-semibold text-muted-foreground">
              {open ? 'latest only' : `show all ${items.length}`}
            </Text>
          </Pressable>
        )}
      </View>
      {hidden > 0 && <Text className="mb-1 text-xs text-muted-foreground">{`${hidden} earlier`}</Text>}
      {shown.map((item) => (
        <View key={item.key} className="flex-row gap-3 py-1.5">
          <Text className="w-[104px] text-xs text-muted-foreground" style={{ fontVariant: ['tabular-nums'] }}>
            {item.stamp}
          </Text>
          <Text className="min-w-0 flex-1 text-sm text-foreground">
            {item.text}
            {!!item.agent && <Text className="text-xs text-muted-foreground">{`  ${item.agent}`}</Text>}
          </Text>
        </View>
      ))}
    </View>
  );
}
