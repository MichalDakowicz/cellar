import { FlashList } from '@shopify/flash-list';
import { type ReactElement } from 'react';
import { Text, View } from 'react-native';

import { EntryCard, type EntryVariant } from '@/components/cellar/EntryCard';
import { KindGlyph } from '@/components/media/Glyphs';
import { EmptyState } from '@/components/ui/states';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import type { Entry, Kind } from '@/types/cellar';

/** `kind` is set on a grouped-by-kind heading, and absent on a day heading. */
export type EntrySection = { key: string; label: string; meta?: string; kind?: Kind };

/** A section heading, or one entry. The list is flat so it virtualizes properly. */
export type EntryListItem = { type: 'section'; section: EntrySection } | { type: 'entry'; entry: Entry };

type EntryListProps = {
  items: EntryListItem[];
  variant?: EntryVariant;
  showCode?: boolean;
  /** Names each entry's project. Set on lists that span more than one. */
  whereFor?: (entry: Entry) => string | undefined;
  onPress: (entry: Entry) => void;
  onFile?: (entry: Entry) => void;
  header?: ReactElement;
  empty?: { title: string; body: string; action?: { label: string; onPress: () => void } };
};

/**
 * The only virtualized container in the app. Sections and rows share one flat
 * list rather than nesting a list per section — a list inside a list settles at
 * one visible row and never re-measures.
 *
 * It pads for the floating nav itself, because the bar is absolutely positioned
 * and reserves no layout (PING.md §8.3); a caller that forgets leaves its last
 * row under the glass.
 */
export function EntryList({
  items,
  variant = 'line',
  showCode = true,
  whereFor,
  onPress,
  onFile,
  header,
  empty,
}: EntryListProps) {
  const navBarSpace = useNavBarSpace();

  return (
    <FlashList
      data={items}
      keyExtractor={(item) => (item.type === 'section' ? `s:${item.section.key}` : item.entry.id)}
      getItemType={(item) => item.type}
      // Anchoring is for chat. Here the data changed because the user
      // re-filtered, and holding their old offset strands them mid-list.
      maintainVisibleContentPosition={{ disabled: true }}
      ListHeaderComponent={header}
      ListEmptyComponent={
        empty ? <EmptyState title={empty.title} body={empty.body} action={empty.action} /> : undefined
      }
      contentContainerStyle={{ paddingBottom: navBarSpace + 8 }}
      renderItem={({ item }) =>
        item.type === 'section' ? (
          <SectionRow section={item.section} />
        ) : (
          <View className={variant === 'inbox' ? 'px-4 pb-2' : 'px-4'}>
            <EntryCard
              entry={item.entry}
              variant={variant}
              showCode={showCode}
              where={whereFor?.(item.entry)}
              onPress={onPress}
              onFile={onFile}
            />
          </View>
        )
      }
    />
  );
}

function SectionRow({ section }: { section: EntrySection }) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-4 pb-1.5 pt-6">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {section.kind && <KindGlyph kind={section.kind} size={13} />}
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground" numberOfLines={1}>
          {section.label}
        </Text>
      </View>
      {!!section.meta && <Text className="text-[11px] font-semibold text-muted-foreground">{section.meta}</Text>}
    </View>
  );
}
