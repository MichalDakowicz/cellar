import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { type ReactElement, type Ref } from 'react';
import { Pressable, Text, View } from 'react-native';

import { EntryCard, type EntryVariant } from '@/components/cellar/EntryCard';
import { KindGlyph } from '@/components/media/Glyphs';
import { EmptyState } from '@/components/ui/states';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { useGutter } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';
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
   * Overrides the screen gutter on the rows and headings. The board's columns
   * are 280px wide and a `px-8` screen gutter inside one eats a quarter of it,
   * so a column passes its own inset rather than inheriting the page's.
   */
  inset?: string;
  /** Which heading keys are folded. Leave it out and headings are not pressable. */
  collapsed?: ReadonlySet<string>;
  onToggleSection?: (key: string) => void;
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
  inset,
  collapsed,
  onToggleSection,
  listRef,
}: EntryListProps) {
  const navBarSpace = useNavBarSpace();
  const screenGutter = useGutter();
  const gutter = inset ?? screenGutter;

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
          <SectionRow
            section={item.section}
            folded={collapsed?.has(item.section.key) ?? false}
            onToggle={onToggleSection}
            inset={inset}
          />
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
 *
 * Pressable when the list folds. The chevron is the only thing added — the
 * count beside it already says how much is under there, which is what makes a
 * folded band readable rather than just gone.
 */
function SectionRow({
  section,
  folded,
  onToggle,
  inset,
}: {
  section: EntrySection;
  folded: boolean;
  onToggle?: (key: string) => void;
  inset?: string;
}) {
  const screenGutter = useGutter();
  const gutter = inset ?? screenGutter;
  const Chevron = folded ? ChevronRight : ChevronDown;

  const chevron = onToggle ? (
    <Chevron size={section.band ? 14 : 12} color={COLORS.muted} strokeWidth={2} />
  ) : null;

  const body = section.band ? (
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
          {chevron}
        </View>
        {!!section.meta && <Text className="text-xs font-semibold text-muted-foreground">{section.meta}</Text>}
      </View>
    </View>
  ) : (
    <View className={`flex-row items-center justify-between gap-3 pb-1.5 pt-4 ${gutter}`}>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        {section.kind && <KindGlyph kind={section.kind} size={13} />}
        <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground" numberOfLines={1}>
          {section.label}
        </Text>
        {chevron}
      </View>
      {!!section.meta && <Text className="text-[11px] font-semibold text-muted-foreground">{section.meta}</Text>}
    </View>
  );

  if (!onToggle) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: !folded }}
      accessibilityLabel={`${folded ? 'show' : 'hide'} ${section.label}`}
      onPress={() => onToggle(section.key)}
      className="active:opacity-60"
    >
      {body}
    </Pressable>
  );
}
