import { Pressable, Text, View } from 'react-native';

import type { NavDestination } from '@/components/layout/navDestinations';
import { COLORS } from '@/theme/colors';

export const DEST_WIDTH = 46;
export const DEST_HEIGHT = 42;

const ICON_ON = '#fafafa';
const ICON_OFF = '#a3a3a3';

/**
 * One slot in the centre island: a glyph and nothing else.
 *
 * No caption under the icon, no word beside it — the destination's name exists
 * only as its accessibility label. Four captions across the island is the one
 * change that turns the bar back into a stock tab bar (PING.md 8.3).
 */
export function NavDestinationButton({
  destination,
  active,
  badge = 0,
  onPress,
}: {
  destination: NavDestination;
  active: boolean;
  /** A count, not an alert: the inbox is a pile and its size is the point. */
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={destination.label}
      onPress={onPress}
      style={{ width: DEST_WIDTH, height: DEST_HEIGHT, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
    >
      {destination.icon(active ? ICON_ON : ICON_OFF, 20)}
      {badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 1,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 3,
            borderRadius: 99,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: COLORS.accent,
            borderWidth: 1.5,
            borderColor: '#161616',
          }}
        >
          <Text style={{ color: COLORS.accentInk, fontSize: 9.5, fontWeight: '700' }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
