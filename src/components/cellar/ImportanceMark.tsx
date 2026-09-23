import { ChevronsDown, ChevronsUp } from 'lucide-react-native';
import { View } from 'react-native';

import { importanceMeta } from '@/lib/importance';
import { COLORS } from '@/theme/colors';
import type { Importance } from '@/types/cellar';

/**
 * The mark on a row that matters more, or less, than the rest of its kind.
 *
 * Nothing for `normal`, like `StateBadge` for `open`. High is the foreground
 * rather than the accent: it can sit on several rows in one list, and an accent
 * repeated down a list stops marking anything. Low is the deeper muted, so it
 * reads as "this can wait" without greying out a thought that is still work.
 */
export function ImportanceMark({ importance, size = 13 }: { importance: Importance; size?: number }) {
  const meta = importanceMeta(importance);
  if (!meta.marked) return null;

  return (
    <View accessibilityLabel={`${meta.label} importance`} className="pt-0.5">
      {meta.value === 'high' ? (
        <ChevronsUp size={size} color={COLORS.foreground} strokeWidth={2.4} />
      ) : (
        <ChevronsDown size={size} color={COLORS.mutedDeep} strokeWidth={2.4} />
      )}
    </View>
  );
}
