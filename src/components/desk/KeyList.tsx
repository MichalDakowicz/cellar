import { Pressable, ScrollView, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import type { DeskKey, KeySuggestion } from '@/lib/deskKeys';
import { COLORS } from '@/theme/colors';
import type { DeskDocument } from '@/lib/deskDocuments';
import { DocumentViewer } from './DocumentViewer';

export type KeyListView = {
  key: DeskKey;
  suggestions: KeySuggestion[];
  /** Said when nothing matches. */
  empty: string;
  notice?: string | null;
  selected?: number;
  scope?: string;
  onPreview?: (pick: KeySuggestion) => Promise<DeskDocument>;
  onPick: (id: string) => void;
};

/**
 * What the word being typed could be (`Keys.dc.html`, phone): above the field,
 * in thumb reach, the first one lit as the one a tap on it puts in.
 */
export function KeyList({ list }: { list: KeyListView }) {
  const [preview, setPreview] = useState<{ scope?: string; id: string; text: string; file?: DeskDocument } | null>(null);
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const selectedId = list.suggestions[list.selected ?? 0]?.id;
  useEffect(() => {
    if (selectedId) scroll.current?.scrollTo({ y: Math.max(0, (positions.current[selectedId] ?? 0) - 60), animated: false });
  }, [selectedId, list.scope]);
  return (
    <View
      accessibilityRole="list"
      accessibilityLabel={`${list.key} results`}
      className="gap-0.5 rounded-2xl border border-border bg-card p-1.5"
    >
      {(list.suggestions.length === 0 || !!list.notice) && (
        <Text accessibilityRole="text" className="font-sans px-2.5 py-3 text-xs text-muted-foreground">{list.notice ?? list.empty}</Text>
      )}
      <ScrollView ref={scroll} style={{ maxHeight: 220 }} keyboardShouldPersistTaps="always" nestedScrollEnabled>
      {list.suggestions.map((suggestion, index) => (
        <View key={suggestion.id} onLayout={(event) => { positions.current[suggestion.id] = event.nativeEvent.layout.y; }}>
          {suggestion.group && suggestion.group !== list.suggestions[index - 1]?.group && (
            <Text className="font-sans px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {suggestion.group}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={suggestion.label}
            accessibilityState={{ selected: index === (list.selected ?? 0) }}
            onPress={() => list.onPick(suggestion.id)}
            onLongPress={() => {
              if (!list.onPreview || !suggestion.id.startsWith('file:')) return;
              const scope = list.scope;
              setPreview({ scope, id: suggestion.id, text: 'Reading file…' });
              void list.onPreview(suggestion).then((file) => setPreview((current) => current && current.scope === scope && current.id === suggestion.id ? { scope, id: suggestion.id, text: '', file } : current))
                .catch((error) => setPreview((current) => current && current.scope === scope && current.id === suggestion.id ? { scope, id: suggestion.id, text: String(error) } : current));
            }}
            className={`min-h-11 flex-row items-center gap-2.5 rounded-[10px] px-2.5 active:opacity-70 ${index === (list.selected ?? 0) ? 'bg-secondary' : ''}`}
          >
            <Text
              className={`min-w-0 flex-1 text-sm ${suggestion.mono ? 'font-mono text-foreground' : ''}`}
              style={suggestion.mono ? undefined : { color: COLORS.foregroundSoft }}
              numberOfLines={1}
            >
              {suggestion.label}
            </Text>
            {!!suggestion.detail && (
              <Text className="font-sans max-w-[45%] text-xs text-muted-foreground" numberOfLines={1}>
                {suggestion.detail}
              </Text>
            )}
          </Pressable>
          {preview?.scope === list.scope && preview?.id === suggestion.id && (preview.file ? <DocumentViewer key={preview.file.path} file={preview.file} /> : <Text selectable className="font-mono px-2.5 py-2 text-xs text-muted-foreground">{preview.text}</Text>)}
        </View>
      ))}
      </ScrollView>
    </View>
  );
}
