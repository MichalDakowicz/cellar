import { MoreHorizontal } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IconBackdrop, ProjectMark } from '@/components/cellar/ProjectMark';
import { useHover, useIsDesktop, webTransition } from '@/hooks/useResponsive';
import { showsHoverControl } from '@/lib/hoverReveal';
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
  /** The picture, when the project has one: drawn as the mark over a blur of itself. */
  icon?: string | null;
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
  const tile = useHover();
  const edit = useHover();
  const isDesktop = useIsDesktop();
  // A mouse can reveal a control; a thumb cannot. The edit dot is permanent on
  // phone and hover-only on desktop, where five always-lit dots across a grid
  // are five things competing with the tile they sit on.
  //
  // The dot's own hover counts as the tile's, or reaching for it takes it away
  // (lib/hoverReveal) — and the lift reads the same union, so the tile does not
  // drop back down the moment the pointer lands on the control it just offered.
  const showEdit = showsHoverControl({
    hasHandler: !!onEdit,
    isDesktop,
    onSurface: tile.hovered,
    onControl: edit.hovered,
  });
  const hovered = tile.hovered || edit.hovered;

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
        {...tile.bind}
        className="active:opacity-80"
      >
        <View className="aspect-[4/3] justify-end rounded-md bg-neutral-900 p-3">
          {project.icon ? (
            <>
              <IconBackdrop icon={project.icon} />
              <ProjectMark icon={project.icon} initials={project.initials} size={40} />
            </>
          ) : (
            <Text
              className="text-3xl font-bold leading-none tracking-tight text-muted-foreground opacity-50"
              numberOfLines={1}
            >
              {project.initials}
            </Text>
          )}
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

      {!!onEdit && (
        // The dot belongs to the artwork, not to the card. Offsetting it from
        // the bottom of the card meant clearing the name and the meta line by
        // hand — 46px of guessed line heights — which left it flush against the
        // artwork's bottom edge while its right inset was a clean 8px, and web
        // metrics are not native metrics, so it read as stuck to the bottom.
        // An overlay the exact shape of the artwork gives it the same inset on
        // both axes, on both platforms, with no arithmetic left to drift.
        //
        // `box-none` so the overlay itself is not a target: the tile underneath
        // has to stay clickable everywhere the dot is not.
        // The ratio is a style rather than a class: `aspect-[4/3]` did not take
        // on an absolutely positioned box, and an overlay that quietly grows to
        // the height of the whole card puts the dot back where it started.
        <View pointerEvents="box-none" className="absolute inset-x-0 top-0" style={{ aspectRatio: 4 / 3 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`edit ${project.name}`}
            hitSlop={8}
            onPress={() => onEdit(project.id)}
            {...edit.bind}
            // Faded rather than unmounted. The dot has to still be there to be
            // hovered, and unmounting it on the tile's hover-out is what made
            // it vanish from under the pointer on the way to the click; a node
            // that survives the hand-off gets its own hover and stays up.
            //
            // Out of the tab order while it is invisible, so a tab does not
            // land on something nobody can see. `focusable` alone does not do
            // it on web — react-native-web leaves the tabindex at 0 — so the
            // web side has to be said in the prop that reaches it.
            focusable={showEdit}
            tabIndex={showEdit ? 0 : -1}
            pointerEvents={showEdit ? 'auto' : 'none'}
            style={[webTransition('opacity'), { opacity: showEdit ? 1 : 0 }]}
            // Its own Pressable over the tile's, not nested inside it — a
            // nested pressable inside a pressed parent swallows the press on
            // Android.
            className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/50 active:opacity-70"
          >
            <MoreHorizontal size={16} color="#fafafa" strokeWidth={2} />
          </Pressable>
        </View>
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
