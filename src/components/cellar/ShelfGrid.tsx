import { View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { FolderCard } from '@/components/cellar/FolderCard';
import { FolderOutline } from '@/components/cellar/FolderOutline';
import { ProjectCard, type ProjectTile } from '@/components/cellar/ProjectCard';
import { useFolderOutlines } from '@/features/cellar/useFolderOutlines';
import { useMeasuredWidth } from '@/hooks/useResponsive';
import { columnsFor, folderRun, type GridCell } from '@/lib/shelfGrid';

/** Half of this pads each cell; the other half is the row's bleed, so the content meets the edges. */
export const GAP = 20;
export const HALF = GAP / 2;

/** The outline sits just inside the cells' own padding, so it never runs through a tile. */
const OUTLINE_INSET = 3;
const OUTLINE_RADIUS = 16;

const SLIDE = LinearTransition.duration(460).easing(Easing.out(Easing.cubic));

/**
 * The shelf: folders and projects in one grid, an open folder's projects
 * following its tile and held together by an outline (`FolderOutline`).
 *
 * Not virtualized on purpose: a shelf holds a handful of projects, not a
 * catalogue, and the grid is the body of a screen that already scrolls — a
 * FlashList inside another scroller settles at one visible row.
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
 * each cell (PING.md §6). The row is `width + GAP` wide, and a cell takes one
 * pixel less than its share of that, so rounding can never wrap the last column.
 */
export function ShelfGrid({
  cells,
  onOpenProject,
  onEditProject,
  onToggleGroup,
  onEditGroup,
}: {
  cells: GridCell<ProjectTile>[];
  onOpenProject: (id: string) => void;
  onEditProject?: (id: string) => void;
  onToggleGroup: (id: string) => void;
  onEditGroup?: (id: string) => void;
}) {
  const { width, onLayout } = useMeasuredWidth();
  const columns = columnsFor(width);
  const cellWidth = Math.floor((width + GAP - 1) / columns);
  const { measure, outlines } = useFolderOutlines(cells, OUTLINE_INSET, OUTLINE_RADIUS);

  return (
    <View onLayout={onLayout}>
      <View style={{ margin: -HALF }}>
        {/* First, so every tile — and a hovered one's lift — draws over it. */}
        {outlines.map((outline) => (
          <FolderOutline key={outline.id} d={outline.d} />
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((cell) => {
            // Staggered by place in the run, so a folder opens as a cascade.
            const order = cell.kind === 'project' && cell.folderId ? folderRun(cells, cell.folderId).indexOf(cell.key) : 0;
            return (
              <Animated.View
                key={cell.key}
                layout={SLIDE}
                entering={cell.kind === 'project' && cell.folderId ? FadeIn.duration(380).delay(60 + order * 40) : undefined}
                exiting={cell.kind === 'project' && cell.folderId ? FadeOut.duration(170) : undefined}
                onLayout={(event) => measure(cell.key, event)}
                style={{ width: cellWidth, padding: HALF }}
              >
                {cell.kind === 'folder' ? (
                  <FolderCard
                    id={cell.group.id}
                    name={cell.group.name}
                    pinned={cell.group.pinned}
                    open={cell.open}
                    tiles={cell.projects}
                    onToggle={onToggleGroup}
                    onEdit={onEditGroup}
                  />
                ) : (
                  <ProjectCard project={cell.project} crumb={cell.crumb} onPress={onOpenProject} onEdit={onEditProject} />
                )}
              </Animated.View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
