import { View } from 'react-native';

import { ProjectCard, type ProjectTile } from '@/components/cellar/ProjectCard';
import { useMeasuredWidth } from '@/hooks/useResponsive';

/** 4:3 tiles, so the columns climb a step slower than a poster grid's would. */
function columnsFor(width: number): number {
  if (width >= 1536) return 6;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  return 2;
}

const GAP = 12;

/**
 * The project grid. Not virtualized on purpose: a shelf holds a handful of
 * projects, not a catalogue, and the grid is the header of a screen that
 * scrolls — a FlashList inside another scroller settles at one visible row.
 *
 * Columns come from the *measured* width of the grid, never the window: with a
 * content cap the window overshoots by hundreds of pixels and the grid renders
 * too many columns (PING.md §8.2).
 */
export function ProjectGrid({ projects, onPress }: { projects: ProjectTile[]; onPress: (id: string) => void }) {
  const { width, onLayout } = useMeasuredWidth();
  const columns = columnsFor(width);

  return (
    <View onLayout={onLayout} className="flex-row flex-wrap" style={{ gap: GAP }}>
      {projects.map((project) => (
        <View key={project.id} style={{ width: (width - GAP * (columns - 1)) / columns }}>
          <ProjectCard project={project} onPress={onPress} />
        </View>
      ))}
    </View>
  );
}
