import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { plural } from '@/lib/utils';

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
 * The one tile. A project has no artwork and never will, so the tile draws its
 * own: the first two letters at display size on a raised ground, which gives a
 * grid of projects the same scannable shape a grid of posters has in Radar
 * without pretending there is an image.
 */
export const ProjectCard = memo(function ProjectCard({
  project,
  onPress,
}: {
  project: ProjectTile;
  onPress: (id: string) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={project.name}
      onPress={() => onPress(project.id)}
      className="active:opacity-80"
    >
      <View className="aspect-[4/3] justify-end rounded-md bg-neutral-900 p-3">
        <Text className="text-3xl font-bold leading-none tracking-tight text-muted-foreground opacity-50" numberOfLines={1}>
          {project.initials}
        </Text>
        {project.liveCount > 0 && (
          <View className="absolute right-2 top-2 rounded-full bg-primary/20 px-2 py-0.5">
            <Text className="text-[10px] font-bold text-primary">{project.liveCount}</Text>
          </View>
        )}
      </View>
      <Text className="mt-2 text-sm font-semibold text-foreground" numberOfLines={1}>
        {project.name}
      </Text>
      <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
        {projectMeta(project)}
      </Text>
    </Pressable>
  );
});

/** "12 entries · 3 glitches". The glitch count only appears when there are any. */
export function projectMeta(project: ProjectTile): string {
  const entries = plural(project.entryCount, 'entry', 'entries');
  if (project.glitchCount === 0) return entries;
  return `${entries} · ${plural(project.glitchCount, 'glitch', 'glitches')}`;
}
