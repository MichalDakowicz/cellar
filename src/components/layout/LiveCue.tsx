import { Text, View } from 'react-native';

import { useLiveStatus } from '@/store/liveStatus';
import { COLORS } from '@/theme/colors';

/**
 * The one mark that says the cellar is not currently being pushed changes.
 *
 * It exists because "live" is a promise, and an app that quietly stops keeping
 * it looks identical to one that has nothing new to show. A dropped socket is
 * the only state worth drawing: `connecting` is the first half second of a cold
 * start and saying anything then would be noise.
 *
 * Deliberately the dimmest thing on the screen — muted text on the chip ground,
 * no accent, no red. Nothing is wrong and nothing is waiting on you; the app
 * just cannot claim to be current, and it heals itself the moment the socket
 * comes back or you return to the app.
 */
export function LiveCue() {
  const down = useLiveStatus((state) => state.status) === 'down';
  if (!down) return null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="not receiving live changes, reconnecting"
      className="mb-2 flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ backgroundColor: COLORS.chipGround }}
    >
      <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: COLORS.mutedDeep }} />
      <Text className="text-[10px] font-medium text-muted-foreground">reconnecting</Text>
    </View>
  );
}
