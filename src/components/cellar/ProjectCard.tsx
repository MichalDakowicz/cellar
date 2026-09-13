import { MoreHorizontal } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { plural } from '@/lib/utils';
import { COLORS } from '@/theme/colors';

export type ProjectTile = {
  id: string;
  name: string;
  /** Two characters, lowercase — the closest this app gets to cover art. */
  initials: string;
  entryCount: number;
  liveCount: number;
  glitchCount: number;
};

/**
 * The one project row.
 *
 * A row rather than a tile, because a project has no artwork and never will:
 * a grid of 4:3 boxes with two letters in them spends most of the screen
 * drawing squares, and a row spends it on the name and the counts — which is
 * the only thing that tells you which project is on fire. PING.md §9.1's `row`
 * shape: `flex-row gap-3 rounded-xl p-3` over `bg-neutral-900`, no border on any
 * edge, the raised ground doing the separating.
 */
export const ProjectCard = memo(function ProjectCard({
  project,
  onPress,
  onEdit,
}: {
  project: ProjectTile;
  onPress: (id: string) => void;
  /** Presence of a handler is what shows the affordance. */
  onEdit?: (id: string) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-neutral-900 p-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={project.name}
        onPress={() => onPress(project.id)}
        className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-80"
      >
        <View className="h-11 w-11 items-center justify-center rounded-md bg-neutral-800">
          <Text className="text-base font-bold text-muted-foreground" numberOfLines={1}>
            {project.initials}
          </Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-bold text-foreground" numberOfLines={1}>
            {project.name}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
            {projectMeta(project)}
          </Text>
        </View>
      </Pressable>

      {project.liveCount > 0 && (
        <View className="rounded-full bg-primary/20 px-2 py-0.5">
          <Text className="text-[11px] font-bold text-primary">{project.liveCount}</Text>
        </View>
      )}

      {onEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`edit ${project.name}`}
          hitSlop={8}
          onPress={() => onEdit(project.id)}
          className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
        >
          <MoreHorizontal size={18} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
});

/** "12 entries · 3 glitches". The glitch count only appears when there are any. */
export function projectMeta(project: ProjectTile): string {
  const entries = plural(project.entryCount, 'entry', 'entries');
  if (project.glitchCount === 0) return entries;
  return `${entries} · ${plural(project.glitchCount, 'glitch', 'glitches')}`;
}
