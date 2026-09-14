import { Text, View } from 'react-native';

import { EntryCard } from '@/components/cellar/EntryCard';
import { Overline } from '@/components/ui/controls';
import type { Entry } from '@/types/cellar';

/**
 * The column beside the capture field on desktop: what you have caught lately,
 * newest first.
 *
 * It exists because a wide window otherwise shows a 920px form and 1600px of
 * nothing, and because the honest answer to "what goes in the space" is the
 * thing this app is for — the pile you are adding to. It is the same EntryCard
 * as everywhere else (PING.md §13); this only stacks them under a heading.
 */
export function DumpAside({
  entries,
  showCode,
  onPress,
}: {
  entries: Entry[];
  showCode: boolean;
  onPress: (entry: Entry) => void;
}) {
  return (
    <View>
      <Overline>lately</Overline>
      {entries.length === 0 ? (
        <Text className="mt-3 text-sm text-muted-foreground">
          nothing in the cellar yet. the first thing you type lands here.
        </Text>
      ) : (
        <View className="mt-2">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} variant="hit" showCode={showCode} onPress={onPress} />
          ))}
        </View>
      )}
    </View>
  );
}
