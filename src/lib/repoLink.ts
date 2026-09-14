import type { Project } from '@/types/cellar';

/**
 * Where a project lives on disk, and how an agent works out which project it is
 * standing in.
 *
 * This is the whole point of the repo link: an agent opened in
 * `C:\ping\cellar\src\lib` should resolve to the Cellar project without anyone
 * being asked which one it is. Asking is the cost the link exists to remove, so
 * the matching has to be reliable enough that the fallback never fires.
 *
 * Pure and free of node's `path`, because the MCP server imports this too and
 * the one rule that must not differ between the app and the agent is which
 * project a directory belongs to.
 */

/**
 * A path in the one shape everything downstream compares: forward slashes, no
 * trailing separator, no surrounding quotes.
 *
 * Case is folded because the two filesystems this ever runs on are Windows and
 * macOS, both case-insensitive — `c:\ping\cellar` and `C:\Ping\Cellar` are one
 * directory and must not be two projects. The display value keeps its original
 * case; only the comparison key is folded.
 */
export function repoKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  if (!clean) return null;
  const slashed = clean.replace(/\\/g, '/').replace(/\/+$/, '');
  return slashed ? slashed.toLowerCase() : null;
}

/** Trimmed and slash-normalised, but still readable. What gets stored. */
export function normalizeRepoPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^["']|["']$/g, '').replace(/[\\/]+$/, '');
  return clean || null;
}

/**
 * A remote, with a scheme so the app can hand it straight to a browser.
 *
 * `github.com/you/cellar` is what a person types and `git@github.com:you/cellar.git`
 * is what they paste out of a remote; both have to end up as something openable
 * or the link in the app is a dead string.
 */
export function normalizeRepoUrl(raw: string | null | undefined): string | null {
  const clean = raw?.trim().replace(/^["']|["']$/g, '');
  if (!clean) return null;

  const scp = /^(?:ssh:\/\/)?git@([^:/]+)[:/](.+?)(?:\.git)?$/.exec(clean);
  if (scp) return `https://${scp[1]}/${scp[2]}`;

  if (/^https?:\/\//i.test(clean)) return clean.replace(/\.git$/, '');
  return `https://${clean.replace(/^\/+/, '').replace(/\.git$/, '')}`;
}

/** `you/cellar` out of a forge URL, the whole host-and-path otherwise. */
export function repoUrlLabel(url: string | null | undefined): string | null {
  if (!url) return null;
  const stripped = url.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const parts = stripped.split('/');
  if (parts.length >= 3) return parts.slice(1, 3).join('/');
  return stripped || null;
}

/** The last segment of a checkout path — `cellar` out of `C:\ping\cellar`. */
export function repoPathLabel(path: string | null | undefined): string | null {
  const key = normalizeRepoPath(path);
  if (!key) return null;
  const parts = key.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? null;
}

/** Whichever link the project has, in the form worth putting on screen. */
export function repoLabel(project: Pick<Project, 'repoPath' | 'repoUrl'>): string | null {
  return repoUrlLabel(project.repoUrl) ?? repoPathLabel(project.repoPath);
}

/**
 * The project whose checkout contains `cwd`, or null.
 *
 * Longest match wins, so a repo nested inside another one — a mod inside a
 * modpack, a package inside a monorepo — resolves to the inner project rather
 * than to whichever row happened to be read first.
 *
 * The boundary check is the part that matters: a plain `startsWith` would put
 * `C:\ping\cellar-old` inside `C:\ping\cellar`, and an agent would then file
 * its work under a project it has never seen.
 */
export function projectForPath<T extends Pick<Project, 'repoPath'>>(
  cwd: string | null | undefined,
  projects: T[],
): T | null {
  const here = repoKey(cwd);
  if (!here) return null;

  let best: T | null = null;
  let bestLength = -1;

  for (const project of projects) {
    const base = repoKey(project.repoPath);
    if (!base) continue;
    if (here !== base && !here.startsWith(`${base}/`)) continue;
    if (base.length > bestLength) {
      best = project;
      bestLength = base.length;
    }
  }

  return best;
}

/**
 * Projects whose checkout sits under `cwd` — the reverse read, for an agent
 * opened at the top of a workspace holding several of them.
 */
export function projectsUnderPath<T extends Pick<Project, 'repoPath'>>(
  cwd: string | null | undefined,
  projects: T[],
): T[] {
  const here = repoKey(cwd);
  if (!here) return [];
  return projects.filter((project) => {
    const base = repoKey(project.repoPath);
    return base !== null && base !== here && base.startsWith(`${here}/`);
  });
}
