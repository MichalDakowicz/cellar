import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { StateBadge } from '@/components/cellar/StateBadge';
import { KIND_GUTTER, KindGlyph, kindLabel, TEXT_LINE } from '@/components/media/Glyphs';
import { stateMeta } from '@/lib/entryState';
import { shortRel } from '@/lib/relTime';
import type { Entry } from '@/types/cellar';

export type EntryVariant = 'line' | 'inbox' | 'hit';

type EntryCardProps = {
  entry: Entry;
  variant?: EntryVariant;
  /** The kind glyph in the left gutter. Off is a real setting, not a size. */
  showCode?: boolean;
  /** Where it lives, for a list that spans projects — the inbox and search. */
  where?: string;
  onPress: (entry: Entry) => void;
  /** Presence of a handler is what shows the file affordance. */
  onFile?: (entry: Entry) => void;
};

/**
 * The one card. Every entry anywhere in the app is this component — the project
 * list, the inbox, the stream, search results and the just-dropped rail. No
 * screen renders a row of its own (PING.md §13).
 *
 * It is a *line*, not a tile: this app has no artwork, and a wall of thoughts
 * only stays readable if the text starts at the same x on every row. That is
 * what the fixed-width glyph gutter buys — the kind is alignment first and
 * information second.
 *
 * Memoized: it renders in every virtualized cell, and without this a filter
 * change re-renders every mounted row.
 */
export const EntryCard = memo(function EntryCard({
  entry,
  variant = 'line',
  showCode = true,
  where,
  onPress,
  onFile,
}: EntryCardProps) {
  const settled = stateMeta(entry.state).settled;
  const grown = entry.lines.length;

  return (
    <View className={variant === 'inbox' ? 'flex-row items-start gap-3 rounded-xl bg-neutral-900 p-3' : 'flex-row'}>
      {showCode && (
        // Centred in the gutter on both axes, and the box is exactly one line
        // of `text-sm` tall (14px over a 20px line box) so the glyph sits on the
        // first line of a thought that wraps to three — not floated above it by
        // a guessed top padding.
        <View
          accessibilityLabel={kindLabel(entry.kind)}
          style={{
            width: KIND_GUTTER,
            height: TEXT_LINE,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <KindGlyph kind={entry.kind} />
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={entry.text}
        onPress={() => onPress(entry)}
        className={[
          'min-w-0 flex-1 flex-row items-start gap-2.5 rounded-lg active:opacity-80',
          variant === 'inbox' ? '' : 'px-2 py-2.5',
        ].join(' ')}
      >
        <Text
          className={['min-w-0 flex-1 text-sm text-foreground', settled ? 'opacity-50' : ''].join(' ')}
          numberOfLines={variant === 'hit' ? 2 : 3}
        >
          {entry.text}
        </Text>

        {grown > 0 && <Text className="pt-px text-xs text-muted-foreground">+{grown}</Text>}
        <StateBadge state={entry.state} />
        {variant !== 'hit' && <Text className="pt-px text-xs text-muted-foreground">{shortRel(entry.createdAt)}</Text>}
        {!!where && (
          <Text className="max-w-[92px] pt-px text-xs text-muted-foreground" numberOfLines={1}>
            {where}
          </Text>
        )}
      </Pressable>

      {onFile && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`file ${entry.text}`}
          hitSlop={8}
          onPress={() => onFile(entry)}
          className="rounded-full bg-primary/15 px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-xs font-bold text-primary">file</Text>
        </Pressable>
      )}
    </View>
  );
});
