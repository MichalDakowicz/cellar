import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { type ReactElement, type Ref } from 'react';
import { Text, View } from 'react-native';

import { EntryCard, type EntryVariant } from '@/components/cellar/EntryCard';
import { KindGlyph } from '@/components/media/Glyphs';
import { EmptyState } from '@/components/ui/states';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useGutter } from '@/hooks/useResponsive';
import type { Entry, Kind } from '@/types/cellar';

/**
 * `kind` is set on a grouped-by-kind heading, and absent on a day heading.
 * `band` marks the outer heading of the grouped reading — a state, or the
 * archive — and carries the colour its rows are badged with so the two agree.
 */
export type EntrySection = {
  key: string;
  label: string;
  meta?: string;
  kind?: Kind;
  band?: { color: string; dim?: boolean };
};

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
  onCopy?: (entry: Entry) => void;
  header?: ReactElement;
  empty?: { title: string; body: string; action?: { label: string; onPress: () => void } };
  /**
   * A handle on the scroller, for a screen that drives it from outside itself —
   * the desktop wheel (`hooks/useWheelToList`). Nothing else should reach in.
   */
  listRef?: Ref<FlashListRef<EntryListItem>>;
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
  onCopy,
  header,
  empty,
  listRef,
}: EntryListProps) {
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();

  return (
    <FlashList
      ref={listRef}
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
          <View className={variant === 'inbox' ? `pb-2 ${gutter}` : gutter}>
            <EntryCard
              entry={item.entry}
              variant={variant}
              showCode={showCode}
              where={whereFor?.(item.entry)}
              onPress={onPress}
              onFile={onFile}
              onCopy={onCopy}
            />
          </View>
        )
      }
    />
  );
}

/**
 * One heading, at one of two weights. A band rules off with a hairline and
 * wears the state's own dot; a kind heading inside it stays the quiet line it
 * has always been, so the two levels never read as the same level.
 */
function SectionRow({ section }: { section: EntrySection }) {
  const gutter = useGutter();

  if (section.band) {
    return (
      <View className={`border-t border-border/60 pb-1 pt-7 ${gutter}`}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: section.band.color, opacity: section.band.dim ? 0.5 : 1 }}
            />
            <Text
              className={[
                'text-sm font-bold tracking-tight',
                // A settled band is history. Its heading reads at the weight of
                // the rows under it, or the archive announces itself louder
                // than the work above it.
                section.band.dim ? 'text-muted-foreground' : 'text-foreground',
              ].join(' ')}
              numberOfLines={1}
            >
              {section.label}
            </Text>
          </View>
          {!!section.meta && <Text className="text-xs font-semibold text-muted-foreground">{section.meta}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-row items-center justify-between gap-3 pb-1.5 pt-4 ${gutter}`}>
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
