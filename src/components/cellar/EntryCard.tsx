import { Check, Copy } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LinkedText } from '@/components/cellar/LinkedText';
import { StateBadge } from '@/components/cellar/StateBadge';
import { KIND_GUTTER, KindGlyph, kindLabel } from '@/components/media/Glyphs';
import { useRowStyle } from '@/components/cellar/rowStyle';
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
  /** Starts a multi-select. Presence of a handler is what makes the row hold-able. */
  onLongPress?: (entry: Entry) => void;
  /** Held in a multi-select: the gutter wears a tick and the row takes a ground. */
  selected?: boolean;
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
  onLongPress,
  selected = false,
  onFile,
  onCopy,
}: EntryCardProps) {
  // Settled either way, or archived. Archive is a band rather than a state, so
  // an archived `open` thought would otherwise sit in the quietest part of the
  // list at full strength (lib/entryState).
  const dimmed = isDimmed(entry);
  const grown = entry.lines.length;
  const { hovered, bind } = useHover();
  // Density and text size (settings). The first-line box the gutter, the copy
  // button and the file pill all centre on is the line plus the row's own
  // padding — on every variant but the inbox, whose Pressable has none.
  const row = useRowStyle();
  const box = variant === 'inbox' ? row.lineHeight : row.lineHeight + 2 * row.padY;

  return (
    <View
      className={variant === 'inbox' ? 'flex-row items-start gap-3 rounded-xl bg-neutral-900 p-3' : 'flex-row'}
      // A row is a click target on web and looks like plain text until the
      // ground moves under the mouse (PING.md §4.5). The inbox row already has
      // a ground, so it lifts; a bare line grows one.
      //
      // The dim is on the row, not on its text: a greyed thought whose glyph,
      // badge and timestamp still read at full strength is louder than the live
      // row above it, which is the opposite of what settling means.
      style={[
        webTransition('background-color'),
        hovered ? { backgroundColor: COLORS.rowHover, borderRadius: 12 } : null,
        // Held beats hovered and beats dimmed: while a selection is up, which
        // rows are in it is the only thing the list is saying.
        selected ? { backgroundColor: COLORS.chipGround, borderRadius: 12 } : null,
        dimmed && !selected ? { opacity: 0.5 } : null,
      ]}
    >
      {(showCode || selected) && (
        // Centred in the gutter on both axes, against the same box the text
        // occupies — so the glyph sits on the *first* line of a thought that
        // wraps to three rather than floating above it. That box is the line
        // plus the row's own vertical padding on every variant but the inbox,
        // whose Pressable has none.
        <View
          accessibilityLabel={kindLabel(entry.kind)}
          style={{
            width: KIND_GUTTER,
            height: box,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* The tick takes the glyph's place rather than sitting beside it.
              The gutter is what makes a wall of one-line rows scan, and a
              column that grows by 20px the moment you hold a row re-flows
              every line of text on the screen. */}
          {selected ? <Check size={14} color={COLORS.accent} strokeWidth={2.5} /> : <KindGlyph kind={entry.kind} />}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={entry.text}
        onPress={() => onPress(entry)}
        onLongPress={onLongPress ? () => onLongPress(entry) : undefined}
        // Hover binds to the Pressable, never to the View around it —
        // react-native-web only implements onHoverIn/Out on Pressable.
        {...bind}
        className={[
          'min-w-0 flex-1 flex-row items-start gap-2.5 rounded-lg active:opacity-80',
          variant === 'inbox' ? '' : 'px-2',
        ].join(' ')}
        style={variant === 'inbox' ? undefined : { paddingVertical: row.padY }}
      >
        <LinkedText
          text={entry.text}
          className="min-w-0 flex-1 text-foreground"
          style={{ fontSize: row.fontSize, lineHeight: row.lineHeight }}
          numberOfLines={variant === 'hit' ? 2 : 3}
        />

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
          style={{ height: box }}
        >
          <Copy size={13} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      )}

      {onFile && (
        // Centred on the same first-line box as the glyph and the copy button.
        // At its own height the pill is taller than the line it sits beside, so
        // top-aligned in an `items-start` row it dropped `file` below the
        // thought's own text and hung past the bottom of a one-line row.
        <View
          style={{
            height: box,
            justifyContent: 'center',
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`file ${entry.text}`}
            hitSlop={8}
            onPress={() => onFile(entry)}
            className="rounded-full bg-primary/15 px-3 py-1 active:opacity-70"
          >
            <Text className="text-xs font-bold text-primary">file</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});
