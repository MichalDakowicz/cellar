import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';

type ReportLine = { id: string; text: string; rel: string };

/**
 * What came back.
 *
 * Its own section rather than mixed into the thread above: your lines are the
 * thought developing and these are reports against it, and one chronological
 * list means you can no longer tell at a glance which is which — the whole
 * reason lines carry a `source` at all.
 *
 * Same row geometry as the thread so the two read as one column, with a `>`
 * gutter instead of `+`. Monochrome, like the kind codes: it is alignment
 * first and information second (PING.md §2.3).
 *
 * The heading does not name the agent. Which one wrote these is already on the
 * entry's own header line, and naming it twice made the section read as being
 * about a particular tool rather than about the side of the thread it is.
 */
export function AgentThread({ lines }: { lines: ReportLine[] }) {
  if (lines.length === 0) return null;

  return (
    <View className="mt-6">
      <Overline>from agent</Overline>
      <View className="mt-1">
        {lines.map((line) => (
          <View key={line.id} className="flex-row items-start gap-2.5 py-2">
            <Text className="w-6 pt-0.5 font-mono text-[11px] text-muted-foreground">{'>'}</Text>
            <Text className="min-w-0 flex-1 text-sm text-foreground">{line.text}</Text>
            <Text className="pt-0.5 text-xs text-muted-foreground">{line.rel}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
