import { ChevronDown, ChevronRight, Folder, MoreHorizontal, Pin } from 'lucide-react-native';
import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { ProjectCard, type ProjectTile } from '@/components/cellar/ProjectCard';
import { columnsFor, HALF } from '@/components/cellar/ProjectGrid';
import { useMeasuredWidth } from '@/hooks/useResponsive';
import { folderEdges, folderWidth, type FolderEdges } from '@/lib/groups';
import { plural } from '@/lib/utils';
import { COLORS } from '@/theme/colors';

const RADIUS = 16;
const EDGE = 1;

/** A cell's share of the folder's outline: only the sides that face out, rounded where two meet. */
function edgeStyle(edges: FolderEdges): ViewStyle {
  return {
    backgroundColor: COLORS.chipGround,
    borderColor: COLORS.islandEdge,
    borderTopWidth: edges.top ? EDGE : 0,
    borderRightWidth: edges.right ? EDGE : 0,
    borderBottomWidth: edges.bottom ? EDGE : 0,
    borderLeftWidth: edges.left ? EDGE : 0,
    borderTopLeftRadius: edges.topLeft ? RADIUS : 0,
    borderTopRightRadius: edges.topRight ? RADIUS : 0,
    borderBottomLeftRadius: edges.bottomLeft ? RADIUS : 0,
    borderBottomRightRadius: edges.bottomRight ? RADIUS : 0,
  };
}

/**
 * A group on the shelf: a folder that opens and closes, drawn around its
 * projects rather than as a box behind them.
 *
 * The outline is the union of its cells — a header tab as wide as the first
 * row, then the tiles — so three projects in two columns make an L, never a
 * square with an empty corner (`lib/groups.folderEdges`). Each cell draws the
 * sides that face out and neighbours touch, so the pieces read as one shape.
 *
 * Closed, it is just the tab, with how many projects are inside.
 */
export function ProjectFolder({
  name,
  pinned,
  open,
  tiles,
  onToggle,
  onEditGroup,
  onPress,
  onEdit,
}: {
  name: string;
  pinned: boolean;
  open: boolean;
  tiles: ProjectTile[];
  onToggle: () => void;
  onEditGroup: () => void;
  onPress: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const { width, onLayout } = useMeasuredWidth();
  const columns = columnsFor(width);
  const cell = Math.floor(width / columns);
  const shown = open && tiles.length > 0;
  const tab = folderWidth(tiles.length, columns) * cell;

  return (
    <View onLayout={onLayout} className="mb-3">
      <View
        style={{
          width: open ? tab : undefined,
          backgroundColor: COLORS.chipGround,
          borderColor: COLORS.islandEdge,
          borderWidth: EDGE,
          borderBottomWidth: shown ? 0 : EDGE,
          borderTopLeftRadius: RADIUS,
          borderTopRightRadius: RADIUS,
          borderBottomLeftRadius: shown ? 0 : RADIUS,
          borderBottomRightRadius: shown ? 0 : RADIUS,
        }}
        className="flex-row items-center gap-2.5 px-3.5 py-2.5"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name}, ${open ? 'close' : 'open'} the folder`}
          accessibilityState={{ expanded: open }}
          onPress={onToggle}
          className="min-w-0 flex-1 flex-row items-center gap-2.5 active:opacity-80"
        >
          <Folder size={15} color={COLORS.muted} strokeWidth={2} />
          <Text className="min-w-0 shrink text-sm font-bold text-foreground" numberOfLines={1}>
            {name}
          </Text>
          {pinned && <Pin size={11} color={COLORS.muted} strokeWidth={2.2} />}
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {plural(tiles.length, 'project')}
          </Text>
          {open ? (
            <ChevronDown size={14} color={COLORS.muted} strokeWidth={2.2} />
          ) : (
            <ChevronRight size={14} color={COLORS.muted} strokeWidth={2.2} />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`edit ${name}`}
          hitSlop={8}
          onPress={onEditGroup}
          className="h-7 w-7 items-center justify-center rounded-full active:opacity-70"
        >
          <MoreHorizontal size={15} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      </View>

      {shown && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {tiles.map((tile, index) => (
            <View key={tile.id} style={[{ width: cell, padding: HALF }, edgeStyle(folderEdges(index, tiles.length, columns))]}>
              <ProjectCard project={tile} onPress={onPress} onEdit={onEdit} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
