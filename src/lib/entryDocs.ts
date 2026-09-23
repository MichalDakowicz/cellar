import { hrefOf, linkHost } from '@/lib/links';
import type { EntryDoc, Project } from '@/types/cellar';

/**
 * A doc hung off a thought: a link, or a path in the repo.
 *
 * One field holds either, and what it is gets decided by looking at it — the
 * decision was "either, one field, resolved by whether it looks like a url",
 * because asking "is this a link or a path" every time you attach one is a
 * mode on a screen that has none.
 *
 * A path is the more useful half for an agent: `docs/OVERVIEW.md` on the brief
 * is "read this before you start", in the repo the brief already names. For
 * you, a path opens when the project's remote is on GitHub, as the file on the
 * default branch; anywhere else it is shown, not linked.
 */

export type DocKind = 'url' | 'path';

const URL_LIKE = /^(?:https?:\/\/|www\.)\S+$/i;

export function docKind(ref: string): DocKind {
  return URL_LIKE.test(ref.trim()) ? 'url' : 'path';
}

/**
 * What goes in the column: trimmed, with a pasted pair of quotes taken off.
 * Nothing else — a path you typed is the path you meant, including its case
 * and its separators, and rewriting it would point the agent somewhere else.
 */
export function normalizeDocRef(input: string): string {
  return input.trim().replace(/^["'`](.*)["'`]$/, '$1').trim();
}

/** Where tapping it goes. `null` for a path with nowhere to open it. */
export function docHref(ref: string, project: Pick<Project, 'repoUrl'> | null): string | null {
  if (docKind(ref) === 'url') return hrefOf(ref.trim());

  const repo = project?.repoUrl ? githubRepo(project.repoUrl) : null;
  if (!repo) return null;
  const path = ref
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.?\/+/, '');
  return `https://github.com/${repo}/blob/HEAD/${path.split('/').map(encodeURIComponent).join('/')}`;
}

function githubRepo(url: string): string | null {
  const match = /github\.com[/:]([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?$/i.exec(url.trim());
  return match ? `${match[1]}/${match[2]}` : null;
}

/** The row's name: the label you gave it, else the host for a link, else the file name. */
export function docTitle(doc: Pick<EntryDoc, 'ref' | 'label'>): string {
  if (doc.label?.trim()) return doc.label.trim();
  if (docKind(doc.ref) === 'url') return linkHost(hrefOf(doc.ref.trim()));
  const parts = doc.ref.trim().replace(/\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] ?? doc.ref;
}

/** The same ref twice on one thought is one doc. */
export function isDuplicateDoc(ref: string, docs: Pick<EntryDoc, 'ref'>[]): boolean {
  const wanted = normalizeDocRef(ref).toLowerCase();
  return docs.some((doc) => doc.ref.toLowerCase() === wanted);
}
