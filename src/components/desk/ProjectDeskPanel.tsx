import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import type { DeskPanelRow } from '@/lib/deskSample';
import { runChip } from '@/lib/deskView';

const DOT: Record<NonNullable<DeskPanelRow['state']>, string> = {
  ok: runChip('done').color,
  busy: runChip('running').color,
  waiting: runChip('waiting').color,
};

/**
 * A project's desk, beside its board (`DeskProjects.dc.html`): its worktrees,
 * the previews that are up, what shipped and how its commands last ran. With
 * nothing tracked yet, the one line that says when it will be.
 */
export function ProjectDeskPanel({
  sections,
  note,
}: {
  sections: { title: string; rows: DeskPanelRow[] }[];
  note: string | null;
}) {
  return (
    <View className="gap-6">
      {sections.map((section) => (
        <View key={section.title} className="gap-2">
          <Overline>{section.title}</Overline>
          {section.rows.map((row) => (
            <View key={row.label} className="gap-0.5">
              <Text className="font-mono text-xs text-foreground" numberOfLines={1}>
                {row.label}
              </Text>
              <View className="flex-row items-center gap-1.5">
                {row.state && <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: DOT[row.state] }} />}
                <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                  {row.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ))}
      {note && <Text className="text-xs text-muted-foreground">{note}</Text>}
    </View>
  );
}
