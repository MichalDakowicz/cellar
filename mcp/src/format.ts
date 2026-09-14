import { shortEntryId } from '@/lib/agentPrompt';
import { askRule, kindWork, LINE_VOICE, splitThread } from '@/lib/agentWork';
import { kindMeta } from '@/lib/kinds';
import { longRel, shortRel } from '@/lib/relTime';
import { repoLabel } from '@/lib/repoLink';
import type { Entry, Project } from '@/types/cellar';

import type { Cellar } from './cellar.ts';

/**
 * What the tools actually return.
 *
 * Text, in the app's own gutter shape, rather than JSON. Two reasons, and both
 * are about the agent reading this rather than about tidiness: a column of
 * `bug` / `idea` / `dsgn` scans the way the app's own list scans, and a JSON
 * object repeats every key on every row — forty entries of `{"id":…,"kind":…}`
 * is most of a page spent on punctuation.
 *
 * Ids are printed short (see `resolveEntry`) because their only job is to come
 * back as the next argument.
 */

/**
 * Re-exported rather than defined here. The app's copy button puts an id of
 * exactly this width on the clipboard, and a server that printed or resolved a
 * different one would make every copied line fail to match.
 */
export const shortId = shortEntryId;

function pad(text: string, width: number): string {
  return text.length >= width ? text : text + ' '.repeat(width - text.length);
}

function projectName(entry: Entry, projects: Project[]): string {
  if (!entry.projectId) return 'inbox';
  return projects.find((project) => project.id === entry.projectId)?.name ?? 'inbox';
}

/** One entry, one line — the same reading the app's list gives. */
export function entryRow(entry: Entry, projects: Project[], now = Date.now()): string {
  const marks = [
    shortId(entry.id),
    pad(kindMeta(entry.kind).code, 4),
    pad(entry.state, 7),
    pad(shortRel(entry.createdAt, now), 4),
    pad(projectName(entry, projects), 12),
  ];
  const tail = [entry.agent ? `(${entry.agent})` : null, entry.archived ? '(archived)' : null]
    .filter(Boolean)
    .join(' ');
  return `${marks.join(' ')} ${entry.text}${tail ? ` ${tail}` : ''}`;
}

export function entryTable(entries: Entry[], projects: Project[], now = Date.now()): string {
  if (entries.length === 0) return '(nothing)';
  return entries.map((entry) => entryRow(entry, projects, now)).join('\n');
}

export function projectRow(project: Project, entries: Entry[]): string {
  const mine = entries.filter((entry) => entry.projectId === project.id && !entry.archived);
  const open = mine.filter((entry) => entry.state === 'open').length;
  const blocked = mine.filter((entry) => entry.state === 'blocked').length;
  const where = repoLabel(project) ?? 'not linked';
  const counts = [`${mine.length} entries`, `${open} open`, blocked ? `${blocked} blocked` : null]
    .filter(Boolean)
    .join(', ');
  return `${shortId(project.id)} ${pad(project.name, 18)} ${pad(counts, 34)} ${where}`;
}

/**
 * The brief an agent gets when it picks something up.
 *
 * Everything it needs in one payload — the thought, both readings of the
 * thread, where the code is, what this kind of thought is asking for, when to
 * stop and ask, and how a line has to read. The alternative is five more tool
 * calls and a line written in the wrong voice at the end of them.
 */
export function entryBrief(entry: Entry, cellar: Cellar, now = Date.now()): string {
  const project = cellar.projects.find((candidate) => candidate.id === entry.projectId) ?? null;
  const { yours, agent } = splitThread(entry.lines);
  const work = kindWork(entry.kind);

  const out: string[] = [
    `entry    ${shortId(entry.id)}  (${entry.id})`,
    `thought  ${entry.text}`,
    `kind     ${entry.kind} — ${work.brief}`,
    `state    ${entry.state}${entry.agent ? ` (${entry.agent})` : ''}${entry.archived ? ' · archived' : ''}`,
    `dumped   ${longRel(entry.createdAt, now)}`,
    `project  ${project?.name ?? 'inbox — no project, so no repo to work in'}`,
  ];

  if (project?.repoPath) out.push(`repo     ${project.repoPath}`);
  if (project?.repoUrl) out.push(`remote   ${project.repoUrl}`);

  if (yours.length > 0) {
    out.push('', 'what they added since:');
    out.push(...yours.map((line) => `  + ${line.text}  (${longRel(line.createdAt, now)})`));
  }

  if (agent.length > 0) {
    out.push('', 'already reported back:');
    out.push(...agent.map((line) => `  > ${line.text}  (${longRel(line.createdAt, now)})`));
  }

  out.push('', `asking     ${askRule(entry.kind)}`, `line voice ${LINE_VOICE}`);

  return out.join('\n');
}

/** The column legend, printed once at the top of a listing. */
export const ROW_LEGEND = 'id / kind / state / age / project / thought';
