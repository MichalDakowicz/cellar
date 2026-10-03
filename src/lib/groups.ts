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

/**
 * The order the dump's file it chips read in: each group's general project
 * first — pinned groups ahead of the rest, the way the shelf draws them —
 * then the pinned projects, then everything else as it came.
 *
 * A group is a place you file into more often than any one project inside it,
 * which is why it outranks a pin. A general project whose group is not in the
 * list is an ordinary project again, so it falls through to the pinned and
 * the rest rather than leading as a group nobody can see.
 */
export function groupsFirst<T extends Pick<Project, 'groupId' | 'groupHome' | 'pinned'>>(
  projects: T[],
  groups: Group[],
): T[] {
  const ordered = [...groups.filter((group) => group.pinned), ...groups.filter((group) => !group.pinned)];
  const homes = ordered.flatMap((group) =>
    projects.filter((project) => project.groupHome && project.groupId === group.id),
  );
  const rest = projects.filter((project) => !homes.includes(project));
  return [...homes, ...rest.filter((project) => project.pinned), ...rest.filter((project) => !project.pinned)];
}

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
