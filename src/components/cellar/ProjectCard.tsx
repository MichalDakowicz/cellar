import { MoreHorizontal } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useHover, useIsDesktop, webTransition } from '@/hooks/useResponsive';
import { plural } from '@/lib/utils';

export type ProjectTile = {
  id: string;
  name: string;
  /** Two characters, lowercase — the closest this app gets to cover art. */
  initials: string;
  entryCount: number;
  liveCount: number;
  /** Live glitches only — a fixed one is history and must not keep the tile lit. */
  glitchCount: number;
};

/**
 * The one project tile.
 *
 * A project has no artwork and never will, so the tile draws its own: the first
 * two letters at display size on a raised ground, which gives a grid of
 * projects the same scannable shape a grid of posters has in Radar without
 * pretending there is an image.
 *
 * The live count sits top-right and the edit control bottom-right — PING.md
 * §9.1's badge and round-action positions, so a tile here lands in the same
 * places a cover tile does in the siblings.
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
  const { hovered, bind } = useHover();
  const isDesktop = useIsDesktop();
  // A mouse can reveal a control; a thumb cannot. The edit dot is permanent on
  // phone and hover-only on desktop, where five always-lit dots across a grid
  // are five things competing with the tile they sit on.
  const showEdit = !!onEdit && (!isDesktop || hovered);

  return (
    <View
      // The lift renders over its neighbours, or the tile to its right clips it.
      style={[webTransition('transform'), hovered ? { transform: [{ scale: 1.035 }], zIndex: 10 } : null]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={project.name}
        onPress={() => onPress(project.id)}
        // react-native-web implements hover on Pressable only, so the bind can
        // never sit on the View that carries the lift.
        {...bind}
        className="active:opacity-80"
      >
        <View className="aspect-[4/3] justify-end rounded-md bg-neutral-900 p-3">
          <Text
            className="text-3xl font-bold leading-none tracking-tight text-muted-foreground opacity-50"
            numberOfLines={1}
          >
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

      {showEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`edit ${project.name}`}
          hitSlop={8}
          onPress={() => onEdit?.(project.id)}
          // Its own Pressable over the tile's, not nested inside it — a nested
          // pressable inside a pressed parent swallows the press on Android.
          className="absolute bottom-[46px] right-2 h-8 w-8 items-center justify-center rounded-full bg-black/50 active:opacity-70"
        >
          <MoreHorizontal size={16} color="#fafafa" strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
});

/** "12 entries · 3 glitches". The glitch half appears only while glitches are still live. */
export function projectMeta(project: ProjectTile): string {
  const entries = plural(project.entryCount, 'entry', 'entries');
  if (project.glitchCount === 0) return entries;
  return `${entries} · ${plural(project.glitchCount, 'glitch', 'glitches')}`;
}
