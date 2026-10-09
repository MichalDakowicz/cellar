import { Bot, Square } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { RunChip } from '@/components/desk/RunChip';
import type { DeskRunCard } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

/**
 * One run on the desk tab (`Main.dc.html`): a glyph tile for what is live, the
 * title, project · agent · age, what it is up to, and its chip. A waiting run
 * sits on the selected ground, so the one that needs you is the one that
 * stands out in the list.
 */
export function DeskRunCardRow({
  run,
  onOpen,
  onStop,
}: {
  run: DeskRunCard;
  onOpen: ((id: string) => void) | null;
  onStop: ((id: string) => void) | null;
}) {
  const live = run.state === 'waiting' || run.state === 'running';

  // Two Pressables side by side, never one inside the other: on web a
  // Pressable is a <button>, and a button inside a button is invalid DOM.
  return (
    <View className={`flex-row items-center gap-2 rounded-xl pr-3 ${run.state === 'waiting' ? 'bg-secondary' : ''}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${run.title}, ${run.state}`}
        disabled={!onOpen}
        onPress={() => onOpen?.(run.id)}
        className="min-w-0 flex-1 flex-row items-center gap-3 py-3 pl-3 active:opacity-80"
      >
        {live && (
          <View className="h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Bot size={20} color={COLORS.muted} strokeWidth={2} />
          </View>
        )}
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {run.title}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {run.meta}
          </Text>
          {run.detail && (
            <Text
              className={`mt-1 text-sm ${run.state === 'waiting' ? 'text-foreground' : 'text-muted-foreground'}`}
              numberOfLines={1}
            >
              {run.detail}
            </Text>
          )}
        </View>
        <RunChip state={run.state} />
      </Pressable>
      {run.stoppable && onStop && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`stop ${run.title}`}
          hitSlop={6}
          onPress={() => onStop(run.id)}
          className="h-9 w-9 items-center justify-center rounded-full border border-border active:opacity-70"
        >
          <Square size={12} color={COLORS.foreground} fill={COLORS.foreground} />
        </Pressable>
      )}
    </View>
  );
}
