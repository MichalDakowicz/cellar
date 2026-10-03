import { Pressable, Text, View } from 'react-native';

import { LinkedText } from '@/components/cellar/LinkedText';
import { PictureImage } from '@/components/cellar/PictureImage';
import { isPictureLine, type ShownPicture } from '@/lib/entryPicture';
import { useHover, webTransition } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

export type ThreadLine = { id: string; text: string; rel: string };

/**
 * Your own lines under the thought — what you came back and added.
 *
 * Paired with `AgentThread`, which is the same geometry with a `>` gutter for
 * what came back from an agent. The two are separate sections on purpose: one
 * chronological list is the wall of one-liners the `source` column exists to
 * prevent.
 *
 * A line is removable and an agent's is not, which is why the handler lives on
 * this component and not on that one — the agent's lines are its report, and
 * deleting half of one leaves a record that says something it never said.
 */
// Generic over the row so the screen can hand back the line it was given —
// `removed` has to keep the stamp to put the line back where it was, and a
// presentational component has no business knowing that.
export function EntryThread<T extends ThreadLine>({
  lines,
  onRemove,
  undone = 0,
  onUndo,
  pictures,
  onOpenPicture,
}: {
  lines: T[];
  onRemove?: (line: T) => void;
  /** The picture a note carries, by line id. A note with one is drawn as the picture. */
  pictures?: Record<string, ShownPicture>;
  onOpenPicture?: (id: string) => void;
  /** How many this screen has taken off and is still holding. */
  undone?: number;
  onUndo?: () => void;
}) {
  if (lines.length === 0 && undone === 0) return null;

  return (
    <View className="mt-4">
      {lines.map((line) => (
        <ThreadRow
          key={line.id}
          line={line}
          onRemove={onRemove}
          picture={pictures?.[line.id]}
          onOpenPicture={onOpenPicture}
        />
      ))}

      {undone > 0 && !!onUndo && (
        // Only while you are on the entry. Undo is for the line you just took
        // off by mistake, not a bin you come back to — leaving is the commit.
        <View className="mt-2 flex-row items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2">
          <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
            {undone === 1 ? 'removed a line' : `removed ${undone} lines`}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="put the line back"
            hitSlop={8}
            onPress={onUndo}
            className="active:opacity-60"
          >
            <Text className="text-xs font-bold text-primary">undo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/**
 * Long press, not a button on every row: a delete affordance repeated down a
 * column reads as the point of the column, and this one is the rare act. The
 * press only arms it — the screen confirms, and keeps the row for undo.
 */
function ThreadRow<T extends ThreadLine>({
  line,
  onRemove,
  picture,
  onOpenPicture,
}: {
  line: T;
  onRemove?: (line: T) => void;
  picture?: ShownPicture;
  onOpenPicture?: (id: string) => void;
}) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole={onRemove ? 'button' : undefined}
      accessibilityLabel={onRemove ? `remove ${line.text}` : undefined}
      disabled={!onRemove}
      onLongPress={onRemove ? () => onRemove(line) : undefined}
      delayLongPress={400}
      {...bind}
      style={[
        webTransition('background-color'),
        hovered && onRemove ? { backgroundColor: COLORS.rowHover, borderRadius: 8 } : null,
      ]}
      className="flex-row items-start gap-2.5 px-1 py-2"
    >
      <Text className="w-6 pt-0.5 font-mono text-[11px] text-muted-foreground">+</Text>
      {picture && isPictureLine(line.text) ? (
        // The thumb, not the picture: a thread of ten is ten small reads, and
        // the tap is what fetches the big one.
        <View className="min-w-0 flex-1 items-start">
          <PictureImage
            uri={picture.uri}
            aspect={picture.aspect}
            width={180}
            label="open the picture"
            onPress={onOpenPicture ? () => onOpenPicture(picture.id) : undefined}
          />
        </View>
      ) : (
        <LinkedText text={line.text} className="min-w-0 flex-1 text-sm text-foreground" />
      )}
      <Text className="pt-0.5 text-xs text-muted-foreground">{line.rel}</Text>
    </Pressable>
  );
}
