import { Copy } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { StateBadge } from '@/components/cellar/StateBadge';
import { KIND_GUTTER, KindGlyph, kindLabel, TEXT_LINE } from '@/components/media/Glyphs';
import { useHover, webTransition } from '@/hooks/useResponsive';
import { isDimmed } from '@/lib/entryState';
import { shortRel } from '@/lib/relTime';
import { COLORS } from '@/theme/colors';
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
  /** Copies the line that starts this thought in an agent. Same rule. */
  onCopy?: (entry: Entry) => void;
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
  onCopy,
}: EntryCardProps) {
  // Settled either way, or archived. Archive is a band rather than a state, so
  // an archived `open` thought would otherwise sit in the quietest part of the
  // list at full strength (lib/entryState).
  const dimmed = isDimmed(entry);
  const grown = entry.lines.length;
  const { hovered, bind } = useHover();

  return (
    <View
      className={variant === 'inbox' ? 'flex-row items-start gap-3 rounded-xl bg-neutral-900 p-3' : 'flex-row'}
      // A row is a click target on web and looks like plain text until the
      // ground moves under the mouse (PING.md §4.5). The inbox row already has
      // a ground, so it lifts; a bare line grows one.
      // The dim is on the row, not on its text: a greyed thought whose glyph,
      // badge and timestamp still read at full strength is louder than the
      // live row above it, which is the opposite of what settling means.
      style={[
        webTransition('background-color'),
        hovered ? { backgroundColor: COLORS.rowHover, borderRadius: 12 } : null,
        dimmed ? { opacity: 0.5 } : null,
      ]}
    >
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
        // Hover binds to the Pressable, never to the View around it —
        // react-native-web only implements onHoverIn/Out on Pressable.
        {...bind}
        className={[
          'min-w-0 flex-1 flex-row items-start gap-2.5 rounded-lg active:opacity-80',
          variant === 'inbox' ? '' : 'px-2 py-2.5',
        ].join(' ')}
      >
        <Text
          className="min-w-0 flex-1 text-sm text-foreground"
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

      {onCopy && (
        // Muted and small, never the accent: it is on every row, and an accent
        // repeated down a list stops marking anything (PING.md §1.2). It sits
        // outside the text Pressable so a tap here cannot open the entry.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`copy a prompt for ${entry.text}`}
          hitSlop={10}
          onPress={() => onCopy(entry)}
          className="items-center justify-center self-start rounded-md px-1.5 active:opacity-60"
          style={{ height: TEXT_LINE + 20 }}
        >
          <Copy size={13} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      )}

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
