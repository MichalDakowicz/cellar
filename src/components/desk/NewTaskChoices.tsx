import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { agentLabel, type DeskAgent } from '@/lib/deskProtocol';
import { DESK_MODES, type DeskMode, type DeskWhere } from '@/lib/deskTask';
import { COLORS } from '@/theme/colors';

/**
 * The choices on the new-task screen (`NewTask.dc.html`): project, where it
 * works, agent, and how much it may do.
 */
export function NewTaskChoices(props: {
  projects: { id: string; name: string }[];
  projectId: string | null;
  onProject: (id: string) => void;
  where: DeskWhere;
  worktreeReason?: string | null;
  onWhere: (where: DeskWhere) => void;
  folder: string | null;
  agents: DeskAgent[];
  agent: DeskAgent;
  onAgent: (agent: DeskAgent) => void;
  mode: DeskMode;
  onMode: (mode: DeskMode) => void;
  modeHint: string;
}) {
  return (
    <View className="gap-5">
      <View className="gap-2.5">
        <Overline>project</Overline>
        {props.projects.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">{props.projects.map((project) => <Pick key={project.id} label={project.name} on={props.projectId === project.id} onPress={() => props.onProject(project.id)} />)}</View>
        ) : (
          <Text className="font-sans text-xs text-muted-foreground">
            no project knows where it lives yet — set a folder on one under edit → where it lives
          </Text>
        )}
        <Text className="font-sans text-xs text-muted-foreground">{props.projectId ? 'your choice' : 'Pick the project this task belongs to.'}</Text>
      </View>

      <View className="gap-2.5">
        <Overline>where it works</Overline>
        <View className="flex-row gap-2">
          <Choice label="new worktree" sub="wt/<task> · from main" on={props.where === 'worktree'}
            disabled={!!props.worktreeReason} onPress={() => props.onWhere('worktree')} />
          <Choice
            label="checkout"
            sub={props.folder ?? 'the project’s folder'}
            on={props.where === 'main'}
            onPress={() => props.onWhere('main')}
          />
        </View>
        <View className="rounded-lg bg-row px-3 py-2.5"><Text className="font-sans text-xs text-muted-foreground">{props.where === 'worktree'
          ? props.worktreeReason ?? 'PC creates a separate folder from local main when it accepts this task. Existing checkout changes stay there.'
          : 'Uses the existing checkout and its current changes.'}</Text></View>
      </View>

      <View className="gap-2.5">
        <Overline>agent</Overline>
        <View className="flex-row flex-wrap gap-2">{props.agents.map((id) => <Pick key={id} label={agentLabel(id)} on={props.agent === id} onPress={() => props.onAgent(id)} />)}</View>
        <Text className="font-sans text-xs text-muted-foreground">your settings</Text>
        <Overline>how much it may do</Overline>
        <View className="flex-row gap-2">
          {DESK_MODES.map((mode) => (
            <Choice
              key={mode.id}
              label={mode.label}
              on={props.mode === mode.id}
              onPress={() => props.onMode(mode.id)}
            />
          ))}
        </View>
        <Text className="font-sans text-xs text-muted-foreground">{props.modeHint}</Text>
      </View>
    </View>
  );
}

/** One of a row of picks, outlined in the accent when it is the one. */
function Choice({
  label,
  sub,
  on,
  disabled = false,
  onPress,
}: {
  label: string;
  sub?: string;
  on: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: on, disabled }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 min-w-0 flex-1 justify-center rounded-lg border px-2.5 py-2 active:opacity-80 ${sub ? 'min-h-[68px]' : ''}`}
      style={[
        { borderColor: on ? COLORS.accent : COLORS.outline },
        on ? { backgroundColor: COLORS.accentSoft } : null,
        disabled ? { opacity: 0.5 } : null,
      ]}
    >
      <Text className={`font-sans text-sm font-semibold text-foreground ${sub ? '' : 'text-center'}`}>{label}</Text>
      {!!sub && (
        <Text className="mt-1 font-mono text-[11px] text-muted-foreground" numberOfLines={2}>
          {sub}
        </Text>
      )}
    </Pressable>
  );
}

function Pick({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} className="min-h-11 justify-center rounded-lg border px-3 py-2" style={{ borderColor: on ? COLORS.accent : COLORS.outline, backgroundColor: on ? COLORS.accentSoft : 'transparent' }}><Text className="font-sans text-sm text-foreground" style={on ? { color: COLORS.accentText } : undefined}>{label}</Text></Pressable>;
}
