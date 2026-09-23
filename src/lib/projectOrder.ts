import type { Project } from '@/types/cellar';

/**
 * Pinned projects first, everything else exactly where it was.
 *
 * Stable on purpose: the list arrives ordered by `position, created_at`, and
 * pinning is a lift, not a re-sort — two pinned projects keep their order
 * relative to each other, and so does everything under them. Applied once, as
 * the projects are read, so the shelf grid, the dump's file it chips and the
 * file it sheet cannot disagree about what comes first.
 *
 * There is deliberately no pinned band anywhere. Inside a shelf this is "first
 * on its shelf"; in a list that spans shelves it is "first of all", which is
 * the shortcut a pin is for — you pinned it because you file into it.
 */
export function pinnedFirst<T extends Pick<Project, 'pinned'>>(projects: T[]): T[] {
  return [...projects.filter((project) => project.pinned), ...projects.filter((project) => !project.pinned)];
}
