import { Text, View } from 'react-native';

import { runChip } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

/** A window past 80% turns amber — the warning, not yet the stop. */
const WARN = runChip('running').color;

/**
 * Settings › desk › usage and accounts (`DeskUsage.dc.html`): each agent's
 * plan windows. Empty until the agents report them (docs/desk/TASKS.md W16) —
 * a guessed percentage is worse than none.
 */
export function DeskUsageBlock({
  agents,
}: {
  agents: { agent: string; windows: { label: string; used: number; resets: string }[] }[];
}) {
  if (agents.length === 0) {
    return (
      <Text className="font-sans text-xs text-muted-foreground">
        each agent’s 5-hour and weekly use shows here once it reports them; accounts per agent come with it.
      </Text>
    );
  }

  return (
    <View className="gap-5">
      <View className="flex-row flex-wrap gap-6">
        {agents.map((row) => (
          <View key={row.agent} className="min-w-[240px] flex-1 gap-2.5">
            <Text className="font-sans text-sm font-semibold text-foreground">
              {row.agent} <Text className="font-sans font-normal text-muted-foreground">· your plan</Text>
            </Text>
            {row.windows.map((window) => (
              <View key={window.label} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="font-sans text-sm text-foreground">{window.label}</Text>
                  <Text className="font-sans text-sm text-muted-foreground">{`${window.used}% · ${window.resets}`}</Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-secondary">
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${window.used}%`, backgroundColor: window.used >= 80 ? WARN : COLORS.foreground, opacity: window.used >= 80 ? 1 : 0.8 }}
                  />
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
      <Text className="font-sans text-xs text-muted-foreground">numbers come from each agent where it reports them; anything marked ≈ is cellar’s own count · sample numbers, the sample desk is on</Text>
    </View>
  );
}
