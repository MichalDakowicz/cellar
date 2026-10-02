import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import type { ProjectTile } from '@/components/cellar/ProjectCard';
import { webTransition } from '@/hooks/useResponsive';

/**
 * What a closed folder shows of what is inside it: up to four of its projects as
 * a 2×2 of small tiles, each its icon, or its two letters where it has none.
 * Opening the folder dims it — the projects themselves are about to be on the
 * grid, and the preview should stop competing with them.
 *
 * The gap is padding on the cells, not `gap`, for the reason `ShelfGrid` gives.
 */
export function FolderPreview({ tiles, dimmed }: { tiles: ProjectTile[]; dimmed: boolean }) {
  return (
    <View
      pointerEvents="none"
      className="absolute inset-3 flex-row flex-wrap"
      style={[webTransition('opacity', '350ms'), { opacity: dimmed ? 0.35 : 1 }]}
    >
      {tiles.slice(0, 4).map((tile) => (
        <View key={tile.id} className="h-1/2 w-1/2 p-[3px]">
          <View className="flex-1 justify-end overflow-hidden rounded-[7px] bg-secondary p-1.5">
            {tile.icon ? (
              <Image source={{ uri: tile.icon }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <Text className="text-[11px] font-bold leading-none text-muted-foreground opacity-60" numberOfLines={1}>
                {tile.initials}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
