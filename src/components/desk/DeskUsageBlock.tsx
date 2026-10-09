import { Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

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
      <Text className="text-xs text-muted-foreground">
        each agent’s 5-hour and weekly use shows here once it reports them; accounts per agent come with it.
      </Text>
    );
  }

  return (
    <View className="gap-5">
      {agents.map((row) => (
        <View key={row.agent} className="gap-2.5">
          <Text className="text-sm font-semibold text-foreground">{row.agent}</Text>
          {row.windows.map((window) => (
            <View key={window.label} className="gap-1">
              <View className="flex-row justify-between">
                <Text className="text-xs text-muted-foreground">{window.label}</Text>
                <Text className="text-xs text-muted-foreground">{`${window.used}% · ${window.resets}`}</Text>
              </View>
              <View className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <View
                  className="h-full rounded-full"
                  style={{ width: `${window.used}%`, backgroundColor: window.used >= 80 ? COLORS.danger : COLORS.accent }}
                />
              </View>
            </View>
          ))}
        </View>
      ))}
      <Text className="text-xs text-muted-foreground">sample numbers — the sample desk is on.</Text>
    </View>
  );
}
