import { Text, View } from 'react-native';

const BARS = ['context', '5h', 'week'];

/**
 * The desktop chat header's usage meter (`DeskChat.dc.html`): context, the 5h
 * window and the week. Drawn empty until the agents report their use
 * (docs/desk/TASKS.md W16) — an estimate would be a number made up.
 */
export function UsageMeter() {
  return (
    <View accessibilityLabel="usage shows here once the agents report it" className="flex-row items-center gap-3 rounded-full border border-border px-3 py-1.5">
      {BARS.map((bar) => (
        <View key={bar} className="flex-row items-center gap-1.5">
          <Text className="font-sans text-[11px] text-muted-foreground">{bar}</Text>
          <View className="h-1 w-8 rounded-full bg-secondary" />
        </View>
      ))}
    </View>
  );
}
