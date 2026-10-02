import { Pin } from 'lucide-react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';

import { IconBackdrop, ProjectMark } from '@/components/cellar/ProjectMark';
import { TileShell } from '@/components/cellar/TileShell';
import { plural } from '@/lib/utils';
import { COLORS } from '@/theme/colors';

export type ProjectTile = {
  id: string;
  name: string;
  /** Two characters, lowercase — the closest this app gets to cover art. */
  initials: string;
  entryCount: number;
  liveCount: number;
  /** Live glitches only — a fixed one is history and must not keep the tile lit. */
  glitchCount: number;
  /** Already sorted first by the time it is a tile; this only draws the mark. */
  pinned: boolean;
  /** The picture, when the project has one: drawn as the mark over a blur of itself. */
  icon?: string | null;
  groupId?: string | null;
  /** The group's general project — where a thought dumped into the group lands. */
  groupHome?: boolean;
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
 * places a cover tile does in the siblings. Frame, hover and the edit control
 * are `TileShell`'s, shared with the folder tile.
 *
 * `crumb` names the folder the tile is drawn inside, so a project lifted out of
 * its folder's outline still says where it lives.
 */
export const ProjectCard = memo(function ProjectCard({
  project,
  crumb,
  onPress,
  onEdit,
}: {
  project: ProjectTile;
  crumb?: string | null;
  onPress: (id: string) => void;
  onEdit?: (id: string) => void;
}) {
  return (
    <TileShell
      label={project.name}
      onPress={() => onPress(project.id)}
      onEdit={onEdit && (() => onEdit(project.id))}
      editLabel={`edit ${project.name}`}
      thumbClassName="justify-end bg-neutral-900"
      thumb={
        <>
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
          {project.pinned && (
            // Top-left, opposite the live count: the badge answers "how much is
            // owed", the pin answers "why is this first", and one corner each
            // keeps them from reading as one number.
            <View className="absolute left-2 top-2" accessibilityLabel="pinned">
              <Pin size={12} color={COLORS.muted} strokeWidth={2.2} />
            </View>
          )}
          {project.liveCount > 0 && (
            <View className="absolute right-2 top-2 rounded-full bg-primary/20 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-primary">{project.liveCount}</Text>
            </View>
          )}
        </>
      }
      title={
        <>
          <Text className="shrink text-sm font-semibold text-foreground" numberOfLines={1}>
            {project.name}
          </Text>
          {!!crumb && (
            <Text className="text-[10.5px] text-muted-foreground opacity-70" numberOfLines={1}>
              in {crumb}
            </Text>
          )}
        </>
      }
      meta={projectMeta(project)}
    />
  );
});

/** "12 entries · 3 glitches". The glitch half appears only while glitches are still live. */
export function projectMeta(project: ProjectTile): string {
  const entries = project.groupHome
    ? `${plural(project.entryCount, 'entry', 'entries')} · whole group`
    : plural(project.entryCount, 'entry', 'entries');
  if (project.glitchCount === 0) return entries;
  return `${entries} · ${plural(project.glitchCount, 'glitch', 'glitches')}`;
}
