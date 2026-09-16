import { useMemo } from 'react';

import type { ProjectTile } from '@/components/cellar/ProjectCard';
import { useCellar, useCurrentShelf } from '@/features/cellar/useCellar';
import { countLive, countLiveOfKind } from '@/lib/entryGroups';
import { plural } from '@/lib/utils';

/**
 * The shelf: every project on the shelf you are standing in front of, and the
 * counts that tell you which one is on fire.
 *
 * `liveCount` is the badge on the tile and it deliberately counts open *and*
 * doing — "how much is still owed here" is one number, and splitting it into
 * two badges makes a grid of tiles unreadable at a glance.
 *
 * `glitchCount` is live as well, for the same reason: both numbers on a tile
 * answer "what is still owed", and a glitch you fixed is not owed.
 */
export function useShelfScreen() {
  const { shelves, projects, entries, loading, error, refetch } = useCellar();
  const { shelf } = useCurrentShelf(shelves);

  const tiles = useMemo<ProjectTile[]>(() => {
    if (!shelf) return [];
    return projects
      .filter((project) => project.shelfId === shelf.id)
      .map((project) => {
        const mine = entries.filter((entry) => entry.projectId === project.id && !entry.archived);
        return {
          id: project.id,
          name: project.name,
          initials: project.name.trim().slice(0, 2).toLowerCase() || '··',
          entryCount: mine.length,
          liveCount: countLive(mine),
          glitchCount: countLiveOfKind(mine, 'glitch'),
        };
      });
  }, [projects, entries, shelf]);

  // The sum of the tiles, not a second sweep of the entries. The header and the
  // grid under it each worked out what was on this shelf on their own, and only
  // the grid remembered the archive — so a shelf read "42 entries" above tiles
  // that added up to 39. Summing what is rendered cannot disagree with it.
  const shelfEntryCount = useMemo(() => tiles.reduce((total, tile) => total + tile.entryCount, 0), [tiles]);

  return {
    loading,
    error,
    refetch,
    shelf,
    shelfName: shelf?.name ?? 'cellar',
    meta: `${plural(tiles.length, 'project')} · ${plural(shelfEntryCount, 'entry', 'entries')}`,
    tiles,
  };
}
