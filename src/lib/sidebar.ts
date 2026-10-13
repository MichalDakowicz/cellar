/**
 * The desktop sidebar's lists (Map › sections, the boards' left aside): the
 * desk's own destinations and the pinned projects with what is open in them.
 *
 * Pure, so the sidebar draws and the tests read the same rows.
 */

export type DeskLink = { id: 'home' | 'chat' | 'commands' | 'previews' | 'phone'; label: string; href: string };

/** Under cellar's four: the desk, in the order the boards draw it. */
export const DESK_LINKS: DeskLink[] = [
  { id: 'home', label: 'home', href: '/desk' },
  { id: 'chat', label: 'chat', href: '/desk/chat' },
  { id: 'commands', label: 'commands', href: '/desk/commands' },
  { id: 'previews', label: 'previews', href: '/desk/previews' },
  { id: 'phone', label: 'phone', href: '/desk/phone' },
];

/** Controllers keep roomy navigation without offering the desktop ADB presenter. */
export const CONTROLLER_DESK_LINKS = DESK_LINKS.filter((link) => link.id !== 'phone');

/** Which desk link a path belongs to; a run belongs to chat, a preview to previews. */
export function deskLinkFor(pathname: string): DeskLink['id'] | null {
  if (pathname === '/desk') return 'home';
  if (pathname === '/desk/chat' || pathname.startsWith('/desk/run/')) return 'chat';
  if (pathname === '/desk/commands') return 'commands';
  if (pathname === '/desk/previews' || pathname.startsWith('/desk/preview/')) return 'previews';
  if (pathname === '/desk/phone') return 'phone';
  return null;
}

const OPEN = new Set(['open', 'doing', 'blocked']);

/** Pinned projects on the shelf in view, each with how many thoughts are still open. */
export function pinnedProjects(
  projects: readonly { id: string; name: string; pinned: boolean; shelfId: string }[],
  entries: readonly { projectId: string | null; state: string; archived: boolean }[],
  shelfId: string | null,
  max = 6,
): { id: string; name: string; open: number }[] {
  return projects
    .filter((project) => project.pinned && (shelfId === null || project.shelfId === shelfId))
    .slice(0, max)
    .map((project) => ({
      id: project.id,
      name: project.name,
      open: entries.filter((entry) => entry.projectId === project.id && !entry.archived && OPEN.has(entry.state)).length,
    }));
}
