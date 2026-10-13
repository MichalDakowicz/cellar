import { ChevronDown, Monitor, Square } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RunChip } from '@/components/desk/RunChip';
import { UsageMeter } from '@/components/desk/UsageMeter';
import type { DeskRunState } from '@/lib/deskProtocol';
import { COLORS } from '@/theme/colors';

/** Compact pinned identity; workspace and diff live in the disclosure. */
export function RunHeader({ title, meta, branch, state, age, diff, onStop, stopping = false, meter = false, connection, known = true }: {
  title: string; meta: string; branch: string | null; state: DeskRunState; age: string | null;
  diff: { added: number; removed: number; files: number } | null;
  onStop: (() => void) | null; meter?: boolean; connection?: string; known?: boolean;
  stopping?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <Pressable accessibilityRole="button" accessibilityLabel="run details" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} className="min-h-11 min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="font-sans min-w-0 flex-1 text-xl font-bold leading-[26px] text-foreground" numberOfLines={1}>{title}</Text>
          <ChevronDown size={16} color={COLORS.foregroundSoft} style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined} />
        </Pressable>
        {meter && <UsageMeter />}
        {onStop && <Pressable accessibilityRole="button" accessibilityLabel={stopping ? 'confirming stop' : 'stop this run'} accessibilityState={{ disabled: stopping }} disabled={stopping} onPress={onStop} className="h-11 w-11 items-center justify-center rounded-lg border border-border">{stopping ? <Text className="font-sans text-xs text-muted-foreground">…</Text> : <Square size={18} color={COLORS.foreground} fill={COLORS.foreground} />}</Pressable>}
      </View>
      <View className="flex-row flex-wrap items-center gap-1.5">
        {known && <RunChip state={state} compact />}
        {!!connection && <View className="flex-row items-center gap-1.5"><Monitor size={14} color={COLORS.muted} /><Text className="font-sans text-xs text-muted-foreground">{connection}</Text></View>}
      </View>
      {expanded && <View className="gap-2 pt-2">
        <Text className="font-sans text-xs font-semibold text-foreground">{title}</Text>
        {!!branch && <Text className="font-mono text-xs text-foreground">{branch}</Text>}
        <Text className="font-sans text-xs text-muted-foreground">{meta}{age ? ` · ${age}` : ''}</Text>
        {diff && <View className="min-h-11 items-center justify-center rounded-lg border border-border px-3">
          <Text className="font-sans text-xs text-foreground">{diff.files} changed files</Text>
          <Text className="font-mono text-[11px]"><Text style={{ color: COLORS.ok }}>+{diff.added}</Text> <Text style={{ color: COLORS.danger }}>−{diff.removed}</Text></Text>
        </View>}
      </View>}
    </View>
  );
}
