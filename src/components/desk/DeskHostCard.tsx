import { ChevronDown, Monitor, MonitorPlay } from 'lucide-react-native';
import { useState } from 'react';
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
  compact = false,
}: {
  name: string;
  online: boolean;
  line: string;
  /** Null until the pc reports them (docs/desk/TASKS.md W2). */
  figures: DeskHostFigures | null;
  /** Null when the screen is out of reach — it needs the same network. */
  onScreen: (() => void) | null;
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className={`${compact ? 'gap-2' : 'gap-3'} rounded-xl bg-row p-3.5`}>
      <View className="flex-row items-center gap-3">
        {!compact && <View className="h-11 w-11 items-center justify-center rounded-lg bg-muted">
          <Monitor size={20} color={COLORS.foreground} strokeWidth={2} />
        </View>}
        <View className="min-w-0 flex-1 gap-0.5">
          {compact && figures ? <><Overline>agent slots</Overline><Text className="font-sans text-sm font-semibold text-foreground">{figures.find((figure) => figure.label === 'agents')?.value}</Text></> : !compact ? <Text className="font-sans text-base font-bold text-foreground" numberOfLines={1}>{name}</Text> : null}
          {(!compact || !figures) && <View className="flex-row items-center gap-1.5">
            {!compact && <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: online ? COLORS.ok : COLORS.mutedDeep }} />}
            <Text className="font-sans min-w-0 flex-1 text-xs text-muted-foreground">
              {line}
            </Text>
          </View>}
        </View>
        {(onScreen || compact) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`see ${name}'s screen`}
            onPress={onScreen ?? undefined}
            disabled={!onScreen}
            style={!onScreen ? { opacity: 0.4 } : undefined}
            className="h-11 w-11 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <MonitorPlay size={20} color={COLORS.foreground} strokeWidth={2} />
          </Pressable>
        )}
      </View>
      {compact && figures && <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} className="min-h-11 flex-row items-center justify-between">
        <Text className="font-sans text-sm text-muted-foreground">cpu &amp; memory</Text><ChevronDown size={16} color={COLORS.muted} />
      </Pressable>}
      {figures && (!compact || expanded) && (
        <View className="flex-row gap-2">
          {figures.filter((figure) => !compact || figure.label !== 'agents').map((figure) => (
            <View key={figure.label} className="flex-1 gap-0.5">
              <Overline>{figure.label}</Overline>
              <Text className="font-sans text-sm font-semibold text-foreground">{figure.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
