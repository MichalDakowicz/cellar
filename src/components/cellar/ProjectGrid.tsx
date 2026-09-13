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
const HALF = GAP / 2;

/**
 * The project grid. Not virtualized on purpose: a shelf holds a handful of
 * projects, not a catalogue, and the grid is the body of a screen that already
 * scrolls — a FlashList inside another scroller settles at one visible row.
 *
 * Columns come from the *measured* width of the grid, never the window: with a
 * content cap the window overshoots by hundreds of pixels and the grid renders
 * too many columns (PING.md §8.2).
 *
 * **The gap is padding, not `gap`.** An earlier version sized each cell to
 * `(width - GAP * (columns - 1)) / columns` and let a `gap` on a wrapping row do
 * the spacing. That is an exact fit — two cells plus one gap equal the
 * container to the pixel — so any sub-pixel rounding overflowed the row and
 * every tile wrapped onto its own line. The grid rendered as a one-column list
 * and looked deliberate. Half the gap pads the row's own bleed and half pads
 * each cell (PING.md §6), so a cell is `width / columns` and the row can never
 * be wider than what it was measured in.
 */
export function ProjectGrid({
  projects,
  onPress,
  onEdit,
}: {
  projects: ProjectTile[];
  onPress: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const { width, onLayout } = useMeasuredWidth();
  const columns = columnsFor(width);
  // Floored, so `columns` cells never total more than the width they sit in.
  const cell = Math.floor(width / columns);

  return (
    <View onLayout={onLayout}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -HALF }}>
        {projects.map((project) => (
          <View key={project.id} style={{ width: cell, padding: HALF }}>
            <ProjectCard project={project} onPress={onPress} onEdit={onEdit} />
          </View>
        ))}
      </View>
    </View>
  );
}
