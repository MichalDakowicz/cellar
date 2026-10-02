import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { COLORS } from '@/theme/colors';

/**
 * The line round an open folder and the projects inside it.
 *
 * Outline only, no fill: a ground under tiles that are themselves dark swallowed
 * their edges, and the line alone is enough to say these belong together. It
 * fades in after the tiles have slid into place and out before they leave, so it
 * never draws round a shape that is not there yet.
 */
export function FolderOutline({ d }: { d: string }) {
  return (
    <Animated.View
      pointerEvents="none"
      entering={FadeIn.duration(320).delay(220)}
      exiting={FadeOut.duration(150)}
      style={StyleSheet.absoluteFill}
    >
      <Svg width="100%" height="100%">
        <Path d={d} fill="none" stroke={COLORS.islandPlate} strokeWidth={1} />
      </Svg>
    </Animated.View>
  );
}
