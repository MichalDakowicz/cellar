import { Monitor, MonitorPlay } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import type { DeskHostFigures } from '@/lib/deskSample';
import { COLORS } from '@/theme/colors';

/**
 * The host on the desk tab (`Main.dc.html`): its name, whether it is awake and
 * how it is reached, a way to its screen, and — when it reports them — cpu,
 * memory and agent slots.
 */
export function DeskHostCard({
  name,
  online,
  line,
  figures,
  onScreen,
}: {
  name: string;
  online: boolean;
  line: string;
  /** Null until the pc reports them (docs/desk/TASKS.md W2). */
  figures: DeskHostFigures | null;
  /** Null when the screen is out of reach — it needs the same network. */
  onScreen: (() => void) | null;
}) {
  return (
    <View className="gap-3.5 rounded-xl bg-secondary/60 p-3.5">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-lg bg-muted">
          <Monitor size={20} color={COLORS.foreground} strokeWidth={2} />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {name}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: online ? COLORS.ok : COLORS.mutedDeep }} />
            <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
              {line}
            </Text>
          </View>
        </View>
        {onScreen && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`see ${name}'s screen`}
            onPress={onScreen}
            className="h-11 w-11 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <MonitorPlay size={20} color={COLORS.foreground} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      {figures && (
        <View className="flex-row gap-2">
          {figures.map((figure) => (
            <View key={figure.label} className="flex-1 gap-0.5">
              <Overline>{figure.label}</Overline>
              <Text className="text-sm font-semibold text-foreground">{figure.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
