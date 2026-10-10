import { Bot } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

export function SampleInboxPreview() {
  return <View accessibilityLabel="sample inbox preview" className="w-full gap-2 bg-background p-3.5">
    <Text className="font-sans text-lg font-bold text-foreground">inbox</Text>
    <Text className="font-sans text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">to file · 4</Text>
    <View className="h-16 flex-row overflow-hidden rounded-xl bg-primary">
      <View className="w-24 items-center justify-center gap-0.5"><Bot size={18} color={COLORS.foreground} /><Text className="font-sans text-[11px] font-semibold text-foreground">to an agent</Text></View>
      <View className="flex-1 justify-center gap-0.5 rounded-xl bg-secondary px-3"><Text className="font-sans text-sm font-semibold text-foreground" numberOfLines={1}>archive needs an undo</Text><Text className="font-sans text-xs text-muted-foreground">idea · 3h ago</Text></View>
    </View>
    {[['streak pill clips on small phones', 'glitch · yesterday'], ['rename shelves to rooms?', 'question · 2d ago'], ['copy for the empty desk', 'copy · 2d ago']].map(([title, detail]) => <View key={title} className="gap-0.5 rounded-xl bg-row px-3 py-2.5"><Text className="font-sans text-sm font-semibold text-foreground" numberOfLines={1}>{title}</Text><Text className="font-sans text-xs text-muted-foreground">{detail}</Text></View>)}
  </View>;
}
