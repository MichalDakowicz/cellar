import { ScrollView, Text, View } from 'react-native';

import { EntryList, type EntryListItem } from '@/components/cellar/EntryList';
import { KindGlyph } from '@/components/media/Glyphs';
import { stateMeta } from '@/lib/entryState';
import type { Band } from '@/lib/entryGroups';
import type { Entry, Kind } from '@/types/cellar';

/** What the board is handed: a column, already cut and already flattened. */
export type BoardColumn = {
  key: string;
  label: string;
  band?: Band;
  kind?: Kind;
  count: number;
  items: EntryListItem[];
};

/**
 * Wide enough for a two-line thought at the app's body size, narrow enough that
 * a second column shows at the edge of a phone — which is what says the board
 * scrolls sideways without a hint having to say it.
 */
const COLUMN_W = 280;

/**
 * The third reading of a project: the same rows, stood up in columns.
 *
 * Every column is an `EntryList`, not a hand-rolled map over entries — the one
 * card and the one list are the rule that keeps a wall of one-line thoughts
 * readable (PING.md §13), and a board is the surface most likely to break it.
 * The nesting is safe because the axes differ: the board scrolls sideways and
 * each column scrolls down, so no virtualizer is inside another on its own
 * axis.
 *
 * An empty column keeps its header and says so. The count on a board is the
 * information — an empty "doing" is the point of looking.
 */
export function KanbanBoard({
  columns,
  showCode,
  onPress,
  onCopy,
}: {
  columns: BoardColumn[];
  showCode: boolean;
  onPress: (entry: Entry) => void;
  onCopy?: (entry: Entry) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // flexGrow makes the columns full height rather than as tall as their
      // tallest content, which is what lets each one scroll on its own. The
      // nav bar's clearance is the inner list's job, the way it is everywhere
      // else — adding it here too would double the gap under the last card.
      contentContainerStyle={{ flexGrow: 1, gap: 10, paddingHorizontal: 14 }}
    >
      {columns.map((column) => (
        <Column key={column.key} column={column} showCode={showCode} onPress={onPress} onCopy={onCopy} />
      ))}
    </ScrollView>
  );
}

function Column({
  column,
  showCode,
  onPress,
  onCopy,
}: {
  column: BoardColumn;
  showCode: boolean;
  onPress: (entry: Entry) => void;
  onCopy?: (entry: Entry) => void;
}) {
  // Settled work is history on a board too — the same dim the grouped bands
  // and the rows themselves wear, so the three readings agree about it.
  const dim = column.band === 'archived' || column.band === 'dropped' || column.band === 'done';
  const dot = column.band ? stateMeta(column.band === 'archived' ? 'dropped' : column.band).color : null;

  return (
    <View className="flex-1 rounded-2xl bg-neutral-900/50" style={{ width: COLUMN_W }}>
      <View className="flex-row items-center justify-between gap-2 px-3 pb-2 pt-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          {dot && (
            <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot, opacity: dim ? 0.5 : 1 }} />
          )}
          {column.kind && <KindGlyph kind={column.kind} size={13} />}
          <Text
            className={[
              'text-[11px] font-semibold uppercase tracking-widest',
              dim ? 'text-muted-foreground' : 'text-foreground',
            ].join(' ')}
            numberOfLines={1}
          >
            {column.label}
          </Text>
        </View>
        <Text className="text-[11px] font-semibold text-muted-foreground">{column.count}</Text>
      </View>

      {column.count === 0 ? (
        <View className="flex-1 items-center pt-6">
          <Text className="text-xs text-muted-foreground opacity-60">nothing here</Text>
        </View>
      ) : (
        <View className="min-h-0 flex-1">
          <EntryList
            items={column.items}
            inset="px-3"
            showCode={showCode}
            onPress={onPress}
            onCopy={onCopy}
          />
        </View>
      )}
    </View>
  );
}
