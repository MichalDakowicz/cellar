import { normalizeRepoPath, projectForPath, repoKey } from '@/lib/repoLink';
import type { Group, Project } from '@/types/cellar';

/**
 * Where on the pc a run may happen: a project's own checkout, or the root a
 * group's checkouts share.
 *
 * A group's home project — "ping", thoughts about the whole family — has no
 * checkout of its own, but its members all sit in one folder (`C:\ping\radar`,
 * `C:\ping\cellar`, …), and that folder is where you work on the family as a
 * whole. A group can say where that is (`cellar_groups.repo_path`, "where it
 * lives" on the group). Unset, its root is the deepest folder its linked
 * members share — as long as at least two of them share it and it is not a
 * bare drive — read off their paths every time, so moving a checkout moves it.
 *
 * Pure, and shared: the phone offers these folders and the pc checks a start
 * against the same function, so the two never disagree about what is allowed.
 */

type Placed = Pick<Project, 'id' | 'name' | 'repoPath'> & Partial<Pick<Project, 'groupId' | 'groupHome'>>;
type Housed = Pick<Group, 'id'> & Partial<Pick<Group, 'repoPath'>>;

/** The deepest folder every path sits in, or null when that is only a drive (or nothing). */
export function commonParent(paths: readonly string[]): string | null {
  const split = paths.map((path) => normalizeRepoPath(path)).filter((path): path is string => !!path);
  if (split.length < 2) return null;
  const parts = split.map((path) => path.split(/[\\/]+/));
  const shared: string[] = [];
  for (let i = 0; i < parts[0].length; i += 1) {
    const segment = parts[0][i];
    if (!parts.every((segments) => segments.length > i + 1 && segments[i].toLowerCase() === segment.toLowerCase())) break;
    shared.push(segment);
  }
  if (shared.length < 2) return null;
  const separator = split.some((path) => path.includes('\\')) ? '\\' : '/';
  return shared.join(separator);
}

/** Group id → its root: the folder it was given, else the one its linked members share. */
export function groupRoots(projects: readonly Placed[], groups: readonly Housed[] = []): Map<string, string> {
  const members = new Map<string, string[]>();
  for (const project of projects) {
    if (!project.groupId || project.groupHome || !project.repoPath) continue;
    members.set(project.groupId, [...(members.get(project.groupId) ?? []), project.repoPath]);
  }
  const roots = new Map<string, string>();
  for (const [groupId, paths] of members) {
    const root = commonParent(paths);
    if (root) roots.set(groupId, root);
  }
  for (const group of groups) {
    const own = normalizeRepoPath(group.repoPath);
    if (own) roots.set(group.id, own);
  }
  return roots;
}

/** The folder a start from this project runs in: its own checkout, or, for a group's home, the group's root. */
export function deskFolderFor(
  project: Placed | null | undefined,
  projects: readonly Placed[],
  groups: readonly Housed[] = [],
): string | null {
  if (!project) return null;
  if (project.repoPath) return normalizeRepoPath(project.repoPath);
  if (project.groupHome && project.groupId) return groupRoots(projects, groups).get(project.groupId) ?? null;
  return null;
}

export type DeskFolder = { projectId: string; name: string; path: string; root: boolean };

/** Every project with somewhere to run, roots first — what the phone's picker offers. */
export function deskFolders(projects: readonly Placed[], groups: readonly Housed[] = []): DeskFolder[] {
  const out: DeskFolder[] = [];
  for (const project of projects) {
    const path = deskFolderFor(project, projects, groups);
    if (path) out.push({ projectId: project.id, name: project.name, path, root: !project.repoPath });
  }
  return out.sort((a, b) => Number(b.root) - Number(a.root));
}

/**
 * Whether a run may start in `cwd`: inside a project's checkout, or exactly a
 * group's root. Exactly, for a root — everything under it is already some
 * project's, and allowing "anything under C:\ping" would also allow folders no
 * project claims.
 */
export function folderAllowed(cwd: string, projects: readonly Placed[], groups: readonly Housed[] = []): boolean {
  if (projectForPath(cwd, projects.filter((project) => !!project.repoPath))) return true;
  const key = repoKey(cwd);
  return [...groupRoots(projects, groups).values()].some((root) => repoKey(root) === key);
}
