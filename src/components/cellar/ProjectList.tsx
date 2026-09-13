import { View } from 'react-native';

import { ProjectCard, type ProjectTile } from '@/components/cellar/ProjectCard';

/**
 * The projects on a shelf, as a column.
 *
 * Not virtualized on purpose: a shelf holds a handful of projects, not a
 * catalogue, and this is the body of a screen that already scrolls — a
 * FlashList inside another scroller settles at one visible row and never
 * re-measures (PING.md §9.2).
 */
export function ProjectList({
  projects,
  onPress,
  onEdit,
}: {
  projects: ProjectTile[];
  onPress: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} onPress={onPress} onEdit={onEdit} />
      ))}
    </View>
  );
}
