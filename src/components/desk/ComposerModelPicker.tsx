import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

export function ComposerModelPicker({ models, efforts, model, effort, onModel, onEffort }: { models: string[]; efforts: string[]; model: string; effort: string; onModel: (model: string) => void; onEffort: (effort: string) => void }) {
  return <View className="gap-2">
    <Text className="font-sans text-xs text-muted-foreground">Sample options · next message only. Host settings stay unchanged.</Text>
    {models.map((name) => <Pressable key={name} accessibilityRole="radio" accessibilityState={{ selected: model === name }} onPress={() => onModel(name)} className="min-h-11 justify-center rounded-lg border px-3" style={{ borderColor: name === model ? COLORS.accent : COLORS.outline, backgroundColor: name === model ? COLORS.accentSoft : 'transparent' }}><Text className="font-sans text-xs text-foreground">{name}</Text></Pressable>)}
    <Text className="font-sans text-xs text-muted-foreground">reasoning</Text>
    <View className="flex-row flex-wrap gap-1.5">{efforts.map((name) => <Pressable key={name} accessibilityRole="radio" accessibilityState={{ selected: effort === name }} onPress={() => onEffort(name)} className="min-h-11 min-w-[45%] flex-1 items-center justify-center rounded-lg border px-2" style={{ borderColor: effort === name ? COLORS.accent : COLORS.outline, backgroundColor: effort === name ? COLORS.accentSoft : 'transparent' }}><Text className="font-sans text-xs text-foreground">{name}</Text></Pressable>)}</View>
  </View>;
}
