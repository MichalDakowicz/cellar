import { Pressable, Text, View } from 'react-native';

import type { DeskKey, KeySuggestion } from '@/lib/deskKeys';

export type KeyListView = {
  key: DeskKey;
  suggestions: KeySuggestion[];
  /** Said when nothing matches. */
  empty: string;
  onPick: (id: string) => void;
};

/**
 * What the word being typed could be (`Keys.dc.html`, phone): above the field,
 * in thumb reach, the first one lit as the one a tap on it puts in.
 */
export function KeyList({ list }: { list: KeyListView }) {
  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={`${list.key} results`}
      className="gap-0.5 rounded-2xl border border-border bg-card p-1.5"
    >
      {list.suggestions.length === 0 && (
        <Text className="px-2.5 py-3 text-xs text-muted-foreground">{list.empty}</Text>
      )}
      {list.suggestions.map((suggestion, index) => (
        <Pressable
          key={suggestion.id}
          accessibilityRole="button"
          accessibilityLabel={suggestion.label}
          onPress={() => list.onPick(suggestion.id)}
          className={`min-h-11 flex-row items-center gap-2.5 rounded-[10px] px-2.5 active:opacity-70 ${index === 0 ? 'bg-secondary' : ''}`}
        >
          <Text
            className={`min-w-0 flex-1 text-sm ${suggestion.mono ? 'font-mono text-foreground' : 'text-muted-foreground'}`}
            numberOfLines={1}
          >
            {suggestion.label}
          </Text>
          {!!suggestion.detail && (
            <Text className="max-w-[45%] text-xs text-muted-foreground" numberOfLines={1}>
              {suggestion.detail}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
