import { BlurView } from 'expo-blur';
import { ChevronLeft, Hand, Keyboard, Mic, MonitorUp, MousePointer2, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { SCREEN_MODES, type ScreenMode } from '@/lib/deskScreen';
import { COLORS } from '@/theme/colors';

const BLUR_METHOD = Platform.OS === 'android' ? 'dimezisBlurView' : 'none';
const HEIGHT = 52;
const SLOT = 46;

const ICONS: Record<ScreenMode, LucideIcon> = { touch: Hand, pad: MousePointer2, keys: Keyboard, voice: Mic };

/**
 * The screen's own islands (`Screen.dc.html`): leave on the left, the four
 * modes in the middle, switch display on the right. Same glass as the app's
 * bar, laid over the picture instead of a page.
 */
export function ScreenIslands({
  mode,
  onMode,
  onLeave,
  bottom,
}: {
  mode: ScreenMode;
  onMode: (mode: ScreenMode) => void;
  onLeave: () => void;
  bottom: number;
}) {
  return (
    <View style={[styles.bar, { bottom }]} pointerEvents="box-none">
      <Glass style={styles.round}>
        <Pressable accessibilityRole="button" accessibilityLabel="leave the screen" onPress={onLeave} style={styles.press}>
          <ChevronLeft size={21} color={COLORS.foreground} strokeWidth={2.2} />
        </Pressable>
      </Glass>
      <Glass style={styles.pill}>
        {SCREEN_MODES.map((option) => {
          const on = option.id === mode;
          const Icon = ICONS[option.id];
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: on }}
              onPress={() => onMode(option.id)}
              style={[styles.slot, on ? styles.slotOn : null]}
            >
              <Icon size={20} color={on ? COLORS.foreground : COLORS.muted} strokeWidth={2} />
            </Pressable>
          );
        })}
      </Glass>
      <Glass style={styles.round}>
        {/* One display until the pc says it has more (W18). */}
        <View accessibilityLabel="switch display — this pc shows one" style={[styles.press, { opacity: 0.4 }]}>
          <MonitorUp size={20} color={COLORS.foreground} strokeWidth={2} />
        </View>
      </Glass>
    </View>
  );
}

/** A plate over the picture: blur, tint, hairline. */
export function Glass({ children, style }: { children: ReactNode; style?: object | object[] }) {
  return (
    <View style={[styles.glass, style]}>
      <BlurView intensity={38} tint="dark" experimentalBlurMethod={BLUR_METHOD} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  glass: {
    borderRadius: 99,
    borderWidth: 1,
    borderColor: COLORS.islandEdge,
    backgroundColor: COLORS.islandFill,
    overflow: 'hidden',
  },
  round: { width: HEIGHT, height: HEIGHT },
  press: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pill: { height: HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  slot: { width: SLOT, height: 42, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  slotOn: { backgroundColor: COLORS.islandPlate },
});
