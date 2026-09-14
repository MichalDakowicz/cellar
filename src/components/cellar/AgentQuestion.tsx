import { Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * An agent stopped and asked.
 *
 * It sits directly under the thought rather than down in the thread, because a
 * blocked entry is the one row in the cellar that is waiting on *you* — putting
 * it below the append field would make the answer the thing you find last.
 *
 * The question is a normal agent line underneath as well. This is the same text
 * pulled up, not a second record of it.
 */
export function AgentQuestion({ question, agent }: { question: string; agent: string | null }) {
  return (
    <View
      className="mt-3.5 rounded-lg px-3.5 py-3"
      style={{ backgroundColor: COLORS.dangerSoft }}
      accessibilityRole="summary"
      accessibilityLabel={`waiting on you: ${question}`}
    >
      <Text className="text-[10px] font-semibold uppercase tracking-[1.2px]" style={{ color: COLORS.danger }}>
        {agent ? `${agent} is waiting on you` : 'waiting on you'}
      </Text>
      <Text className="mt-1.5 text-sm leading-snug text-foreground">{question}</Text>
      <Text className="mt-2 text-xs text-muted-foreground">
        answer it below and set the state back to open — nothing moves until you do.
      </Text>
    </View>
  );
}
