import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { groupLine } from '@/lib/deskLater';
import type { SAMPLE_GROUP } from '@/lib/deskSample';
import { metaParts, runChip } from '@/lib/deskView';
import { TextParts } from '@/components/desk/TextParts';
import { COLORS } from '@/theme/colors';
import { Pill } from './PhoneTools';

type Group = typeof SAMPLE_GROUP;

const WORD = { done: 'done', running: 'working', waiting: 'waiting on you', stopped: 'skipped' } as const;

/**
 * A group run (`DeskGroupRun.dc.html`): one prompt across a shelf of projects,
 * each in its own worktree with its own rules — where each stands, and how
 * each ships with its own commands. Drawn until group runs exist (W19).
 */
export function GroupBody({ group }: { group: Group }) {
  return (
    <View className="gap-5">
      <View className="flex-row justify-end gap-2"><Pill label="follow up all" /><Pill label="stop all" /></View>
      <Text className="font-sans rounded-xl bg-secondary px-4 py-3 text-sm leading-6 text-foreground">{group.prompt}</Text>
      <View className="gap-2">
        <Overline>{`per project · ${groupLine(group.projects)}`}</Overline>
        {group.projects.map((project) => {
          const chip = runChip(project.state);
          return (
            <View key={project.name} className={`flex-row flex-wrap items-center gap-3 rounded-xl px-3.5 py-3 ${project.state === 'waiting' ? 'bg-secondary' : 'bg-row'}`}>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="font-sans text-base font-bold text-foreground">{project.name}</Text>
                <Text className="font-sans text-xs text-muted-foreground" numberOfLines={1}>
                  <TextParts parts={metaParts(project.line)} />
                </Text>
              </View>
              <Text className="font-sans rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: chip.color, backgroundColor: chip.tint }}>
                {WORD[project.state]}
              </Text>
              <Pill label={project.state === 'done' ? 'preview' : project.state === 'waiting' ? 'answer' : 'open'} primary={project.state === 'waiting'} />
            </View>
          );
        })}
      </View>
      <View className="gap-2.5">
        <Overline>the same change, side by side</Overline>
        <View className="flex-row flex-wrap gap-3">{group.projects.slice(0, 2).map((project) => <View key={project.name} className="min-w-[240px] flex-1 overflow-hidden rounded-xl bg-row py-2.5"><Text className="px-3 pb-1.5 font-mono text-xs text-foreground">{project.name} · Button</Text><Text className="px-3 font-mono text-xs leading-5" style={{ color: COLORS.danger, backgroundColor: COLORS.dangerSoft }}>− border-radius: 10px;</Text><Text className="px-3 font-mono text-xs leading-5" style={{ color: COLORS.ok }}>+ border-radius: var(--radius-control);</Text></View>)}</View>
      </View>
      <View className="gap-2.5 border-t border-border/50 pt-5">
        <View className="flex-row flex-wrap items-center justify-between gap-3"><Overline>ship · each with its own commands</Overline><Pill label="ship what passed" primary /></View>
        {group.projects
          .filter((project) => project.ship.length > 0)
          .map((project) => (
            <View key={project.name} className="flex-row items-center gap-2.5">
              <Text className="font-sans min-w-0 flex-1 text-sm text-foreground">{project.name}</Text>
              {project.ship.map((command) => (
                <Text key={command} className="rounded-md bg-secondary px-1.5 font-mono text-xs text-foreground">
                  {command}
                </Text>
              ))}
              <Text className="font-sans text-xs text-muted-foreground">{project.shipState}</Text>
            </View>
          ))}
      </View>
    </View>
  );
}
