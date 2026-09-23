import type { Group, Project } from '@/types/cellar';

/**
 * Groups — the level between a shelf and its projects, for an ecosystem of
 * apps that are one thing from far away (ping: radar, lidar, sonar, pulsar,
 * cellar).
 *
 * A group is not a place a thought can sit on its own. It owns a **general**
 * project — `group_home` — named after it and listed first inside it, and a
 * thought dumped into the group lands there. So `project_id is null` still
 * means the inbox and nothing else, every "filed somewhere" query stays true,
 * and the general project can carry the ecosystem's parent folder as its repo:
 * an agent standing in C:\ping lands on it, one in C:\ping\radar on radar,
 * because the longest checkout wins (`repoLink.projectForPath`).
 */

export type ShelfSection<T extends Pick<Project, 'id' | 'groupId' | 'groupHome'>> =
  | { type: 'group'; group: Group; projects: T[] }
  | { type: 'loose'; projects: T[] };

/**
 * A shelf as it is drawn: every group as a folder, pinned groups first, then
 * the projects in no group. Inside a folder the general project leads and the
 * rest keep the order they came in. A group with nothing in it still shows —
 * an empty folder you just made is not one that should vanish.
 */
export function shelfSections<T extends Pick<Project, 'id' | 'groupId' | 'groupHome'>>(
  projects: T[],
  groups: Group[],
): ShelfSection<T>[] {
  const known = new Set(groups.map((group) => group.id));
  const ordered = [...groups.filter((group) => group.pinned), ...groups.filter((group) => !group.pinned)];

  const folders: ShelfSection<T>[] = ordered.map((group) => {
    const mine = projects.filter((project) => project.groupId === group.id);
    return {
      type: 'group',
      group,
      projects: [...mine.filter((project) => project.groupHome), ...mine.filter((project) => !project.groupHome)],
    };
  });

  // A project pointing at a group that is not on this shelf's list — deleted on
  // another device, moved away — reads as loose rather than disappearing.
  const loose = projects.filter((project) => !project.groupId || !known.has(project.groupId));
  return loose.length > 0 ? [...folders, { type: 'loose', projects: loose }] : folders;
}

export type FolderEdges = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  topLeft: boolean;
  topRight: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
};

/**
 * Which sides of a tile's cell are the outside of its folder.
 *
 * The folder's outline is not a box around the grid — it is the union of its
 * cells, so a group of three in two columns is an L, not a square with a hole.
 * Each cell draws a border on the sides that face out and rounds the corners
 * where two outside edges meet; neighbours touch, so the pieces read as one
 * line. The folder's header sits on top as row -1, as wide as the first row,
 * so the top of the first row is never an outside edge while it is shown.
 */
export function folderEdges(index: number, count: number, columns: number, withHeader = true): FolderEdges {
  const col = index % columns;
  const row = Math.floor(index / columns);
  const top = row === 0 && !withHeader;
  const left = col === 0;
  const right = col === columns - 1 || index === count - 1;
  const bottom = index + columns >= count;
  return {
    top,
    right,
    bottom,
    left,
    topLeft: top && left,
    topRight: top && right,
    bottomLeft: bottom && left,
    bottomRight: bottom && right,
  };
}

/** How many columns wide the folder's header is: its first row, never wider. */
export function folderWidth(count: number, columns: number): number {
  return Math.max(1, Math.min(count, columns));
}
