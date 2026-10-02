import { ChevronRight, Folder, Pin } from 'lucide-react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { FolderPreview } from '@/components/cellar/FolderPreview';
import type { ProjectTile } from '@/components/cellar/ProjectCard';
import { TileShell } from '@/components/cellar/TileShell';
import { webTransition } from '@/hooks/useResponsive';
import { plural } from '@/lib/utils';
import { COLORS } from '@/theme/colors';

/**
 * A group on the shelf, as a tile in the same grid as its projects.
 *
 * Closed, it previews what is inside and says how much. Open, it steps back —
 * no ground, a brighter edge, the preview dimmed — because its projects are now
 * the tiles after it and the outline `ShelfGrid` draws round the run is what
 * holds them together. The count top-right is how many projects, not how many
 * are owed: a folder is a place, and the number that means "owed" belongs to
 * the tile that has something to owe.
 */
export const FolderCard = memo(function FolderCard({
  id,
  name,
  pinned,
  open,
  tiles,
  onToggle,
  onEdit,
}: {
  id: string;
  name: string;
  pinned: boolean;
  open: boolean;
  tiles: ProjectTile[];
  onToggle: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  const entries = tiles.reduce((total, tile) => total + tile.entryCount, 0);
  return (
    <TileShell
      label={`${name}, ${open ? 'close' : 'open'} the folder`}
      expanded={open}
      onPress={() => onToggle(id)}
      onEdit={onEdit && (() => onEdit(id))}
      editLabel={`edit ${name}`}
      thumbStyle={{
        backgroundColor: open ? 'transparent' : COLORS.chipGround,
        borderWidth: 1,
        borderColor: open ? COLORS.islandPlate : COLORS.islandEdge,
      }}
      thumb={
        <>
          <FolderPreview tiles={tiles} dimmed={open} />
          {pinned && (
            <View className="absolute left-2 top-2" accessibilityLabel="pinned">
              <Pin size={12} color={COLORS.muted} strokeWidth={2.2} />
            </View>
          )}
          {tiles.length > 0 && (
            <View className="absolute right-2 top-2 rounded-full bg-secondary px-2 py-0.5">
              <Text className="text-[10px] font-bold text-muted-foreground">{tiles.length}</Text>
            </View>
          )}
        </>
      }
      title={
        <>
          <Folder size={14} color={COLORS.muted} strokeWidth={2} />
          <Text className="shrink text-sm font-semibold text-foreground" numberOfLines={1}>
            {name}
          </Text>
          <View className="ml-auto" style={[webTransition('transform', '350ms'), { transform: [{ rotate: open ? '90deg' : '0deg' }] }]}>
            <ChevronRight size={12} color={COLORS.muted} strokeWidth={2.2} />
          </View>
        </>
      }
      meta={`${plural(tiles.length, 'project')} · ${plural(entries, 'entry', 'entries')}`}
    />
  );
});
