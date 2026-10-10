import { Bot } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { RunChip } from '@/components/desk/RunChip';
import { detailParts, metaParts, type DeskRunCard } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

import { TextParts } from './TextParts';

/**
 * One run on the desk tab (`Main.dc.html`, `.ping-row`): every row on the row
 * ground, a waiting one on the raised one so the run that needs you stands
 * out; a glyph tile for what is live; title, project · agent · branch · age
 * with its diff coloured; what it is up to with the command or path in mono;
 * its chip. Stopping is on the run's own screen, where you can see what you
 * are stopping.
 */
export function DeskRunCardRow({ run, onOpen }: { run: DeskRunCard; onOpen: ((id: string) => void) | null }) {
  const waiting = run.state === 'waiting';
  const live = waiting || run.state === 'running';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${run.title}, ${run.state}`}
      disabled={!onOpen}
      onPress={() => onOpen?.(run.id)}
      className={`flex-row items-center gap-3 rounded-xl p-3 active:opacity-80 ${waiting ? 'bg-secondary' : 'bg-secondary/60'}`}
    >
      {live && (
        <View className={`h-10 w-10 items-center justify-center rounded-lg ${waiting ? 'bg-white/10' : 'bg-secondary'}`}>
          <Bot size={20} color={COLORS.foregroundSoft} strokeWidth={2} />
        </View>
      )}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {run.title}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          <TextParts parts={metaParts(run.meta)} />
        </Text>
        {run.detail && (
          <Text className={`mt-1 text-sm ${waiting ? 'text-foreground' : 'text-muted-foreground'}`} numberOfLines={1}>
            <TextParts parts={detailParts(run.detail)} />
          </Text>
        )}
      </View>
      <RunChip state={run.state} />
    </Pressable>
  );
}
