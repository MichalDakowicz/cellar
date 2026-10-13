import { Pressable, Text, View } from 'react-native';

import { agentLabel, isLiveRun, RUN_STATE_LABEL, type DeskRun } from '@/lib/deskProtocol';
import { repoPathLabel } from '@/lib/repoLink';
import { longRel } from '@/lib/relTime';

/**
 * One run on the pc: what it is, which agent, where it is up to.
 *
 * `needs you at the pc` is the state worth seeing from across the room, so it
 * is the one drawn in the accent. Stop is offered on what this desk started and
 * is still going — a session somebody opened at the pc is theirs to stop.
 */
export function DeskRunRow({
  run,
  onOpen,
  onStop,
}: {
  run: DeskRun;
  /** Null when this wire cannot read a run's log (through the cellar). */
  onOpen: ((run: DeskRun) => void) | null;
  onStop: ((run: DeskRun) => void) | null;
}) {
  const live = isLiveRun(run);
  const where = repoPathLabel(run.cwd) ?? run.cwd;
  const canStop = onStop !== null && live && run.origin === 'phone';

  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${run.name}, ${RUN_STATE_LABEL[run.state]}`}
        disabled={!onOpen}
        onPress={() => onOpen?.(run)}
        className="min-w-0 flex-1 active:opacity-70"
      >
        <Text className="text-sm text-foreground" numberOfLines={2}>
          {run.name}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
          <Text className={run.state === 'waiting' ? 'font-semibold text-primary' : ''}>{RUN_STATE_LABEL[run.state]}</Text>
          {` · ${agentLabel(run.agent)} · ${where} · ${longRel(new Date(run.startedAt).toISOString())}`}
          {run.origin === 'pc' ? ' · opened at the pc' : ''}
        </Text>
      </Pressable>
      {canStop && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`stop ${run.name}`}
          hitSlop={8}
          onPress={() => onStop(run)}
          className="rounded-full border border-border px-3 py-1.5 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-muted-foreground">stop</Text>
        </Pressable>
      )}
    </View>
  );
}
