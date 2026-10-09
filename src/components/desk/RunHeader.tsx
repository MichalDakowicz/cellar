import { GitBranch, Square } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { RunChip } from '@/components/desk/RunChip';
import type { DeskRunState } from '@/lib/deskProtocol';
import { COLORS } from '@/theme/colors';

/**
 * The top of a run (`Run.dc.html`): branch · project · agent, the title, its
 * chip and age, the diff pill and stop.
 */
export function RunHeader({
  title,
  meta,
  branch,
  state,
  age,
  diff,
  onStop,
}: {
  title: string;
  meta: string;
  branch: string | null;
  state: DeskRunState;
  age: string | null;
  diff: { added: number; removed: number; files: number } | null;
  onStop: (() => void) | null;
}) {
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-1.5">
        {branch && <GitBranch size={14} color={COLORS.muted} strokeWidth={2} />}
        <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
          {branch ? <Text className="font-mono">{branch}</Text> : null}
          {branch && meta ? ' · ' : ''}
          {meta}
        </Text>
      </View>
      <Text className="text-xl font-bold leading-tight text-foreground">{title}</Text>
      <View className="mt-1 flex-row items-center gap-2">
        <RunChip state={state} />
        {age && <Text className="text-xs text-muted-foreground">{age}</Text>}
        <View className="flex-1" />
        {diff && (
          <View className="h-9 flex-row items-center gap-1.5 rounded-full border border-border px-3">
            <Text className="font-mono text-xs font-semibold" style={{ color: COLORS.ok }}>
              +{diff.added}
            </Text>
            <Text className="font-mono text-xs font-semibold" style={{ color: COLORS.danger }}>
              −{diff.removed}
            </Text>
            <Text className="text-xs font-semibold text-muted-foreground">· {diff.files} files</Text>
          </View>
        )}
        {onStop && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="stop this run"
            onPress={onStop}
            className="h-9 w-9 items-center justify-center rounded-full border border-border active:opacity-70"
          >
            <Square size={12} color={COLORS.foreground} fill={COLORS.foreground} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
