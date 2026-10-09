import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { groupLine } from '@/lib/deskLater';
import type { SAMPLE_GROUP } from '@/lib/deskSample';
import { runChip } from '@/lib/deskView';

type Group = typeof SAMPLE_GROUP;

const WORD = { done: 'done', running: 'doing', waiting: 'waiting on you', stopped: 'skipped' } as const;

/**
 * A group run (`DeskGroupRun.dc.html`): one prompt across a shelf of projects,
 * each in its own worktree with its own rules — where each stands, and how
 * each ships with its own commands. Drawn until group runs exist (W19).
 */
export function GroupBody({ group }: { group: Group }) {
  return (
    <View className="gap-5">
      <Text className="rounded-xl bg-secondary px-4 py-3 text-sm leading-6 text-foreground">{group.prompt}</Text>
      <View className="gap-2">
        <Overline>{`per project · ${groupLine(group.projects)}`}</Overline>
        {group.projects.map((project) => {
          const chip = runChip(project.state);
          return (
            <View key={project.name} className="flex-row items-center gap-3 rounded-xl bg-secondary/60 px-3.5 py-3">
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-base font-bold text-foreground">{project.name}</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {project.line}
                </Text>
              </View>
              <Text className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: chip.color, backgroundColor: chip.tint }}>
                {WORD[project.state]}
              </Text>
            </View>
          );
        })}
      </View>
      <View className="gap-2">
        <Overline>ship · each with its own commands</Overline>
        {group.projects
          .filter((project) => project.ship.length > 0)
          .map((project) => (
            <View key={project.name} className="flex-row items-center gap-2.5">
              <Text className="min-w-0 flex-1 text-sm text-foreground">{project.name}</Text>
              {project.ship.map((command) => (
                <Text key={command} className="rounded-md bg-secondary px-1.5 font-mono text-xs text-foreground">
                  {command}
                </Text>
              ))}
              <Text className="text-xs text-muted-foreground">{project.shipState}</Text>
            </View>
          ))}
      </View>
    </View>
  );
}
