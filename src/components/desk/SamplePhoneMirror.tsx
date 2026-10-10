import { Archive } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

const ROWS = [
  ['streak pill clips on small phones', 'glitch · yesterday'],
  ['rename shelves to rooms?', 'question · 2d ago'],
  ['copy for the empty desk', 'copy · 2d ago'],
];

/** The canvas's drawn phone. Only rendered inside explicitly sample surfaces. */
export function SamplePhoneMirror({ width = 300, driving = true }: { width?: number; driving?: boolean }) {
  const scale = width / 300;
  return (
    <View accessibilityLabel="sample phone screen" style={{ width, height: 640 * scale, overflow: 'hidden', alignSelf: 'center' }}>
      <View className="gap-3 overflow-hidden rounded-[40px] border-[8px] border-row bg-background px-4 pt-11" style={{ width: 300, height: 640, transform: [{ scale }], transformOrigin: 'top left' }}>
        {driving && <View className="absolute left-3 right-3 top-2.5 h-[26px] items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.18)' }}><Text className="font-sans text-[11px] font-semibold" style={{ color: '#fbbf24' }}>claude is driving · sample</Text></View>}
        <Text className="font-sans text-[22px] font-bold text-foreground">inbox</Text>
        <Text className="font-sans text-[10px] font-semibold tracking-widest text-muted-foreground">TO FILE · 4</Text>
        <View className="h-[68px] flex-row overflow-hidden rounded-xl bg-primary">
          <View className="min-w-0 flex-1 justify-center gap-0.5 rounded-xl bg-secondary px-3"><Text className="font-sans text-[13px] font-semibold text-foreground">archive needs an undo</Text><Text className="font-sans text-[10px] text-muted-foreground">idea · 3h ago</Text></View>
          <View className="w-[92px] items-center justify-center gap-0.5"><Archive size={16} color={COLORS.foreground} /><Text className="font-sans text-[10px] text-foreground">archive</Text></View>
          {driving && <View className="absolute left-24 top-5 h-7 w-7 rounded-full border-2" style={{ borderColor: '#fbbf24' }} />}
        </View>
        {ROWS.map(([title, detail]) => <View key={title} className="h-[60px] justify-center gap-0.5 rounded-xl bg-row px-3"><Text className="font-sans text-[13px] font-semibold text-foreground">{title}</Text><Text className="font-sans text-[10px] text-muted-foreground">{detail}</Text></View>)}
        <View className="absolute bottom-16 self-center flex-row items-center gap-3 rounded-lg bg-secondary px-3 py-2"><Text className="font-sans text-[11px] text-foreground">archived</Text><Text className="font-sans text-[11px] font-bold" style={{ color: COLORS.accentText }}>undo</Text></View>
        <View className="absolute bottom-3.5 left-0 right-0 flex-row justify-center gap-1.5"><View className="h-9 w-9 rounded-full bg-secondary" /><View className="h-9 w-[124px] rounded-full bg-secondary" /><View className="h-9 w-9 rounded-full bg-secondary" /></View>
      </View>
    </View>
  );
}
