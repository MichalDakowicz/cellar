import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import type { SAMPLE_NIGHT } from '@/lib/deskSample';
import { runChip } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

type Night = typeof SAMPLE_NIGHT;

const CHIP = {
  passed: { label: 'checks pass', state: 'done' },
  waiting: { label: 'needs you', state: 'waiting' },
  failed: { label: 'failed', state: 'running' },
} as const;

const DONE: Record<string, string> = {
  keep: 'kept · merged into main',
  toss: 'tossed · worktree deleted',
  follow: 'follow-up sent · back in the queue',
};

/**
 * The night shift's digest (`PhoneNight.dc.html`): each run with keep, toss or
 * follow up, then tonight's queue. Answered here, locally, until the night
 * shift runs for real (docs/desk/TASKS.md W19).
 */
export function NightBody({ night, onAdd }: { night: Night; onAdd: () => void }) {
  const [done, setDone] = useState<Record<string, string>>({});

  return (
    <View className="gap-4">
      {night.runs.map((run) => {
        const chip = runChip(CHIP[run.state].state);
        const settled = done[run.id];
        return (
          <View key={run.id} className="gap-1.5 rounded-xl bg-secondary/60 p-3">
            <View className="flex-row items-center gap-2">
              <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
                {run.title}
              </Text>
              <Text className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: chip.color, backgroundColor: chip.tint }}>
                {CHIP[run.state].label}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {run.meta}
            </Text>
            {settled ? (
              <Text className="text-sm text-muted-foreground">{DONE[settled]}</Text>
            ) : (
              <>
                <Text className="text-sm" style={{ color: COLORS.foregroundSoft }}>
                  {run.summary}
                </Text>
                <View className="mt-1 flex-row gap-1.5">
                  <Act label="toss" onPress={() => setDone((now) => ({ ...now, [run.id]: 'toss' }))} />
                  <Act label={run.second} outlined onPress={() => setDone((now) => ({ ...now, [run.id]: 'follow' }))} />
                  {run.state === 'passed' && (
                    <Act label="keep" primary onPress={() => setDone((now) => ({ ...now, [run.id]: 'keep' }))} />
                  )}
                </View>
              </>
            )}
          </View>
        );
      })}
      <View className="gap-2 pt-2">
        <Overline>{`tonight · ${night.tonight.length} queued`}</Overline>
        {night.tonight.map((task) => (
          <View key={task.title} className="flex-row gap-2">
            <Text className="min-w-0 flex-1 text-sm text-foreground" numberOfLines={1}>
              {task.title}
            </Text>
            <Text className="text-xs text-muted-foreground">{task.project}</Text>
          </View>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={onAdd}
          className="mt-1 h-11 items-center justify-center rounded-full border border-dashed active:opacity-70"
          style={{ borderColor: COLORS.outline }}
        >
          <Text className="text-sm font-semibold" style={{ color: COLORS.foregroundSoft }}>
            add something for tonight
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Act({ label, onPress, outlined, primary }: { label: string; onPress: () => void; outlined?: boolean; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-10 justify-center rounded-full px-3.5 active:opacity-70 ${primary ? 'ml-auto bg-primary' : outlined ? 'border border-border' : ''}`}
    >
      <Text className={`text-[13px] font-semibold ${primary ? 'text-primary-foreground' : outlined ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</Text>
    </Pressable>
  );
}
