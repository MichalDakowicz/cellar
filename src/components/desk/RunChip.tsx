import { Text, View } from 'react-native';

import type { DeskRunState } from '@/lib/deskProtocol';
import { runChip } from '@/lib/deskView';

/**
 * The one run chip — waiting, doing, done. Every run row, run header and
 * notification preview uses this, so the colour of "waiting on you" is the
 * same wherever it shows (docs/desk/screens.md).
 */
export function RunChip({ state }: { state: DeskRunState }) {
  const meta = runChip(state);

  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: meta.tint }}>
      <Text className="text-[11px] font-semibold" style={{ color: meta.color }} numberOfLines={1}>
        {meta.label}
      </Text>
    </View>
  );
}
