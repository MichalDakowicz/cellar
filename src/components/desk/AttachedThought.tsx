import { X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { KindGlyph } from '@/components/media/Glyphs';
import { Chip, Overline } from '@/components/ui/controls';
import type { DeskSplit } from '@/lib/deskTask';
import type { Kind } from '@/types/cellar';
import { COLORS } from '@/theme/colors';

const SPLITS: { id: DeskSplit; label: string }[] = [
  { id: 'one', label: 'one run' },
  { id: 'each', label: 'one run each' },
];

/**
 * "from your cellar" on the new-task screen: the thoughts the run picks up. The
 * agent claims them and writes what it did back under each, so they are named
 * here before you send — and any can be let go of. Several can go to one run
 * or to one run each (`DeskProjects.dc.html`).
 */
export function AttachedThought({
  thoughts,
  onDetach,
  split,
  onSplit,
}: {
  thoughts: { id: string; text: string; kind: Kind; kindLabel: string }[];
  onDetach: (id: string) => void;
  /** Null with one thought: there is nothing to split. */
  split: DeskSplit | null;
  onSplit: (split: DeskSplit) => void;
}) {
  if (thoughts.length === 0) return null;

  return (
    <View className="gap-2.5">
      <Overline>from your cellar</Overline>
      {thoughts.map((thought) => (
        <View key={thought.id} className="flex-row items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2.5">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <KindGlyph kind={thought.kind} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {thought.text}
            </Text>
            <Text className="text-xs text-muted-foreground">{thought.kindLabel} · the agent claims it and appends what it did</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="leave this thought out"
            hitSlop={6}
            onPress={() => onDetach(thought.id)}
            className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
          >
            <X size={16} color={COLORS.muted} strokeWidth={2} />
          </Pressable>
        </View>
      ))}
      {split && (
        <View className="flex-row gap-2">
          {SPLITS.map((option) => (
            <Chip key={option.id} label={option.label} selected={split === option.id} onPress={() => onSplit(option.id)} />
          ))}
        </View>
      )}
    </View>
  );
}
