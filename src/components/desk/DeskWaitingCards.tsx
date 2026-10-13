import { CircleHelp } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { DeskRunCardRow } from './DeskRunCardRow';
import { RunChip } from './RunChip';
import { Overline } from '@/components/ui/controls';
import type { DeskRunCard } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

export function DeskWaitingCards({ runs, thoughts, onRun, onThought }: { runs: DeskRunCard[]; thoughts: { id: string; title: string; detail: string }[]; onRun: (id: string) => void; onThought: (id: string) => void }) {
  if (!runs.length && !thoughts.length) return null;
  return <View className="gap-2.5">
    <View className="flex-row items-center justify-between gap-2"><Overline>{`waiting on you · ${runs.length + thoughts.length}${runs.some((run) => run.id.startsWith('sample-')) ? ' · includes sample' : ''}`}</Overline><Text className="font-sans text-xs text-muted-foreground">all projects</Text></View>
    {runs.map((run) => <DeskRunCardRow key={run.id} run={run} onOpen={onRun} />)}
    {thoughts.map((thought) => <Pressable key={thought.id} accessibilityRole="button" onPress={() => onThought(thought.id)} className="flex-row items-start gap-3 rounded-xl bg-secondary p-3">
      <View className="h-10 w-10 items-center justify-center rounded-lg bg-white/10"><CircleHelp size={20} color={COLORS.foregroundSoft} /></View>
      <View className="min-w-0 flex-1 gap-1"><View className="flex-row items-center justify-between"><Text className="font-sans text-xs text-muted-foreground">question</Text><RunChip state="waiting" /></View><Text className="font-sans text-base font-bold text-foreground">{thought.title}</Text><Text className="font-sans text-sm text-foreground" numberOfLines={2}>{thought.detail}</Text></View>
    </Pressable>)}
  </View>;
}
