import { Text, View } from 'react-native';

import type { EntryState } from '@/types/cellar';

export type SpreadRow = { value: EntryState; label: string; color: string; count: number; pct: number };

type StateSpreadProps = {
  rows: SpreadRow[];
};

/**
 * Where the cellar — or one project — stands: one stacked line, then the five
 * states under it.
 *
 * The line is the reading — five widths tell you at a glance whether this is a
 * pile of open thoughts or a pile of settled ones, which a column of numbers
 * never does. It is the same device Radar splits films from TV with
 * (components/stats/ContentMix), so the two apps' stats pages read the same way
 * with nothing shared but the shape. Stats draws it over a shelf, a project's
 * rail over that project, and they read identically because it is one
 * component fed by one tally (tallyStates).
 *
 * `open` and `dropped` carry the same grey in `entryState` — badged versus not
 * is what separates them on a row, and a bar has no badge. Dropped is drawn at
 * half opacity so the two segments cannot be read as one, and its dot matches,
 * so the legend and the line agree.
 */
export function StateSpread({ rows }: StateSpreadProps) {
  const filled = rows.filter((row) => row.count > 0);

  return (
    <View>
      <View className="h-2 w-full flex-row gap-1 overflow-hidden rounded-full">
        {filled.map((row) => (
          <View
            key={row.value}
            className="rounded-full"
            style={{ width: `${row.pct}%`, backgroundColor: row.color, opacity: dim(row.value) }}
          />
        ))}
      </View>

      <View className="mt-3.5 gap-2">
        {rows.map((row) => (
          <View key={row.value} className="flex-row items-center gap-2.5">
            <View
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: row.color, opacity: dim(row.value) }}
            />
            <Text className="min-w-0 flex-1 text-sm text-foreground">{row.label}</Text>
            <Text className="text-xs text-muted-foreground">
              {row.count} <Text className="text-muted-foreground/70">· {row.pct}%</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function dim(state: EntryState): number {
  return state === 'dropped' ? 0.5 : 1;
}
