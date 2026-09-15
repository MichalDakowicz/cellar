import { Pencil } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { StateSpread, type SpreadRow } from '@/components/cellar/StateSpread';
import { KindGlyph } from '@/components/media/Glyphs';
import { Overline } from '@/components/ui/controls';
import { ENTRY_STATES } from '@/lib/entryState';
import { useEntryFilter } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';
import type { EntryState, Kind } from '@/types/cellar';

export type KindBar = { kind: Kind; count: number; pct: number };

type ProjectAsideProps = {
  stateSpread: SpreadRow[];
  kindBars: KindBar[];
  onEdit: () => void;
};

/**
 * The desktop column beside a project's entries: what is in it, and the
 * controls that narrow it.
 *
 * The filter lives here **open** rather than behind the funnel. On a phone a
 * sheet is right — the screen has room for the list and nothing else, and a
 * filter you opened is a filter you remember. On a desktop the same sheet hides
 * the one control the screen is most likely to use behind a glyph, while 300px
 * of the window sits empty next to it. The funnel is still there on phone; this
 * is the same store, so the two can never hold different filters.
 */
export function ProjectAside({ stateSpread, kindBars, onEdit }: ProjectAsideProps) {
  const filter = useEntryFilter((state) => state.filter);
  const setFilter = useEntryFilter((state) => state.setFilter);
  const toggleKind = useEntryFilter((state) => state.toggleKind);
  const clear = useEntryFilter((state) => state.clear);
  const narrowed = filter.kinds.length > 0 || filter.state !== null;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <Overline>where it stands</Overline>
      <View className="mt-3">
        <StateSpread rows={stateSpread} />
      </View>

      {kindBars.length > 0 && (
        <View className="mt-7">
          <Overline>by kind</Overline>
          <View className="mt-3 gap-2.5">
            {kindBars.map((bar) => (
              <View key={bar.kind}>
                <View className="flex-row items-center justify-between gap-2">
                  <View className="min-w-0 flex-row items-center gap-2">
                    <KindGlyph kind={bar.kind} size={12} />
                    <Text className="text-xs text-foreground">{bar.kind}</Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">{bar.count}</Text>
                </View>
                <View className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
                  <View className="h-full rounded-full bg-primary" style={{ width: `${bar.pct}%` }} />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="mt-7 flex-row items-center justify-between gap-2">
        <Overline>narrow it</Overline>
        {narrowed && (
          <Pressable accessibilityRole="button" accessibilityLabel="clear the filter" onPress={clear} hitSlop={8}>
            <Text className="text-[11px] font-semibold text-primary">clear</Text>
          </Pressable>
        )}
      </View>
      <View className="mt-2.5 gap-3">
        <ChipWrap
          label="kind"
          options={kindChips(filter.kinds)}
          selected={filter.kinds}
          onToggle={(kind: Kind) => toggleKind(kind)}
        />
        <ChipWrap
          label="state"
          options={[
            { value: 'any' as const, label: 'any state' },
            ...ENTRY_STATES.map((state) => ({ value: state.value, label: state.label })),
          ]}
          selected={filter.state ?? 'any'}
          onToggle={(value) => setFilter({ ...filter, state: value === 'any' ? null : (value as EntryState) })}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="rename, move or delete this project"
        onPress={onEdit}
        className="mt-7 flex-row items-center gap-2 rounded-lg border border-border px-3 py-2.5 active:opacity-80"
      >
        <Pencil size={14} color={COLORS.muted} strokeWidth={2} />
        <Text className="text-xs font-semibold text-foreground">rename, move or delete</Text>
      </Pressable>
    </ScrollView>
  );
}
