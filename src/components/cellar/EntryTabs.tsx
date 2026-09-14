import { Pressable, ScrollView, Text, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import { DEFAULT_TAB, type EntryTab, type TabCount } from '@/lib/entryTabs';
import { COLORS } from '@/theme/colors';

type EntryTabsProps = {
  counts: TabCount[];
  tab: EntryTab;
  onTab: (tab: EntryTab) => void;
  /** Phone lists sit against the screen edge; the rail does not. */
  gutter?: string;
};

/**
 * The six cuts of a project, with what is behind each one.
 *
 * Empty tabs drop out, so a fresh project shows `open` alone rather than six
 * words and five zeroes — but the tab you are standing on always stays, or
 * emptying it would pull the page out from under you, and `open` always stays,
 * because it is the one you get sent back to.
 *
 * The count is the whole point of tabs over a filter: a cut that hides four
 * done thoughts while saying "4" is narrowing the page, not losing them.
 */
export function EntryTabs({ counts, tab, onTab, gutter = '' }: EntryTabsProps) {
  const shown = counts.filter((row) => row.count > 0 || row.tab === tab || row.tab === DEFAULT_TAB);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
      className={gutter}
    >
      {shown.map((row) => (
        <Tab key={row.tab} row={row} active={row.tab === tab} onPress={() => onTab(row.tab)} />
      ))}
      {/* The row scrolls; without this the last tab ends flush against the edge
          and reads as cut off rather than as the end. */}
      <View className="w-2" />
    </ScrollView>
  );
}

function Tab({ row, active, onPress }: { row: TabCount; active: boolean; onPress: () => void }) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={`${row.label}, ${row.count}`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...bind}
      style={[
        webTransition('background-color'),
        hovered && !active ? { backgroundColor: COLORS.chipGround } : null,
      ]}
      className={[
        'h-9 flex-row items-center gap-1.5 rounded-full border px-3.5',
        active ? 'border-primary bg-primary/15' : 'border-border bg-transparent',
      ].join(' ')}
    >
      <Text className={['text-xs font-semibold', active ? 'text-primary' : 'text-muted-foreground'].join(' ')}>
        {row.label}
      </Text>
      <Text className={['text-xs tabular-nums', active ? 'text-primary/70' : 'text-muted-foreground/60'].join(' ')}>
        {row.count}
      </Text>
    </Pressable>
  );
}
