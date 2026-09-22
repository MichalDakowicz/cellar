import { BlurView } from 'expo-blur';
import { Copy, FolderInput, X } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_ISLAND_GAP, NAV_ISLAND_HEIGHT } from '@/hooks/useNavBarSpace';
import { useIsDesktop } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

const BLUR_METHOD = Platform.OS === 'android' ? 'dimezisBlurView' : 'none';

/**
 * What a held selection can have done to it: file it, copy it, drop it.
 *
 * A fourth floating island rather than a bar across the screen, so it belongs
 * to the same family as the nav below it (PING.md §8). It rides directly above
 * the nav islands instead of replacing them: the left island is still the
 * screen's own action and swapping it for a selection action would mean two
 * different things wearing one plate.
 *
 * It renders nothing when nothing is held, so a screen can mount it
 * unconditionally.
 */
export function SelectionBar({
  count,
  onFile,
  onCopy,
  onClear,
}: {
  count: number;
  onFile: () => void;
  onCopy: () => void;
  onClear: () => void;
}) {
  const insets = useSafeAreaInsets();
  const isDesktop = useIsDesktop();

  if (count === 0) return null;

  // Desktop has no floating nav to clear — navigation is the sidebar — so the
  // island sits at the bottom of the window with ordinary air under it.
  const bottom = isDesktop
    ? NAV_ISLAND_GAP * 2
    : insets.bottom + NAV_ISLAND_GAP * 2 + NAV_ISLAND_HEIGHT + NAV_ISLAND_GAP;

  return (
    <View style={[styles.bar, { bottom }]} pointerEvents="box-none">
      <BlurView intensity={40} tint="dark" experimentalBlurMethod={BLUR_METHOD} style={styles.island}>
        <Text className="px-1 text-sm font-bold text-foreground">{count} held</Text>
        <Action label={`file ${count === 1 ? 'it' : 'them'}`} onPress={onFile}>
          <FolderInput size={17} color={COLORS.accent} strokeWidth={2} />
        </Action>
        <Action label="copy a prompt for them" onPress={onCopy}>
          <Copy size={16} color={COLORS.foreground} strokeWidth={2} />
        </Action>
        <Action label="let them go" onPress={onClear}>
          <X size={16} color={COLORS.muted} strokeWidth={2} />
        </Action>
      </BlurView>
    </View>
  );
}

function Action({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      className="h-9 w-10 items-center justify-center rounded-xl active:opacity-60"
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  island: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: NAV_ISLAND_HEIGHT,
    paddingHorizontal: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.islandEdge,
    backgroundColor: COLORS.islandFill,
  },
});
