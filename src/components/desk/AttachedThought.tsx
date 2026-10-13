import { X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { KindGlyph } from '@/components/media/Glyphs';
import { Overline } from '@/components/ui/controls';
import type { Kind } from '@/types/cellar';
import { COLORS } from '@/theme/colors';

/**
 * "from your cellar" on the new-task screen: the thoughts the run picks up. The
 * agent claims them and writes what it did back under each, so they are named
 * here before you send — and any can be let go of. Several can go to one run
 * or to one run each (`DeskProjects.dc.html`).
 */
export function AttachedThought({
  thoughts,
  onDetach,
}: {
  thoughts: { id: string; text: string; kind: Kind; kindLabel: string }[];
  onDetach: (id: string) => void;
}) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between gap-2"><Overline>{`from your cellar · ${thoughts.length}`}</Overline><View className="min-h-11 justify-center rounded-lg border border-border px-3 opacity-40" accessibilityLabel="add thought · coming soon"><Text className="font-sans text-sm text-foreground">add thought</Text></View></View>
      {thoughts.length === 0 && <Text className="font-sans text-xs text-muted-foreground">Optional context. Your prompt can start a task on its own.</Text>}
      {thoughts.map((thought) => (
        <View key={thought.id} className="flex-row items-center gap-2 border-t border-border/50 py-2">
          <View className="h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <KindGlyph kind={thought.kind} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-sm text-foreground" numberOfLines={2}>
              {thought.text}
            </Text>
            <Text className="font-sans text-xs text-muted-foreground">{thought.kindLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="leave this thought out"
            hitSlop={6}
            onPress={() => onDetach(thought.id)}
            className="h-11 w-11 items-center justify-center rounded-lg border border-border active:opacity-70"
          >
            <X size={16} color={COLORS.muted} strokeWidth={2} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}
