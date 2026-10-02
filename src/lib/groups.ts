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
