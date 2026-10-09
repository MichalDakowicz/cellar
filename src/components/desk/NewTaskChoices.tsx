import { Pressable, Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
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
          <ChipWrap
            label="project"
            options={props.projects.map((project) => ({ value: project.id, label: project.name }))}
            selected={props.projectId}
            onToggle={props.onProject}
          />
        ) : (
          <Text className="text-xs text-muted-foreground">
            no project knows where it lives yet — set a folder on one under edit → where it lives
          </Text>
        )}
      </View>

      <View className="gap-2.5">
        <Overline>where it works</Overline>
        <View className="flex-row gap-2">
          <Choice
            label="main checkout"
            sub={props.folder ?? 'the project’s folder'}
            on={props.where === 'main'}
            onPress={() => props.onWhere('main')}
          />
          {/* Drawn ahead of the pc knowing how (docs/desk/TASKS.md W5). */}
          <Choice label="new worktree" sub="coming — off main, its own branch" on={false} disabled onPress={() => {}} />
        </View>
      </View>

      <View className="gap-2.5">
        <Overline>agent · how much it may do</Overline>
        <ChipWrap
          label="agent"
          options={props.agents.map((id) => ({ value: id, label: agentLabel(id) }))}
          selected={props.agent}
          onToggle={props.onAgent}
        />
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
        <Text className="text-xs text-muted-foreground">{props.modeHint}</Text>
        <Text className="text-xs text-muted-foreground">
          for now the pc still runs every agent in its own auto mode — this choice reaches it soon.
        </Text>
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
      className={`min-h-11 flex-1 justify-center rounded-xl border-2 px-3 py-2 active:opacity-80 ${on ? 'border-primary' : 'border-border'}`}
      style={[on ? { backgroundColor: COLORS.accentSoft } : null, disabled ? { opacity: 0.5 } : null]}
    >
      <Text className={`text-sm font-semibold text-foreground ${sub ? '' : 'text-center'}`}>{label}</Text>
      {!!sub && (
        <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
          {sub}
        </Text>
      )}
    </Pressable>
  );
}
