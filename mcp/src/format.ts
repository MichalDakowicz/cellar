import { shortEntryId } from '@/lib/agentPrompt';
import { askRule, ASK_WHERE, kindWork, LINE_VOICE, splitThread } from '@/lib/agentWork';
import {
  optionLabel,
  pendingQuestions,
  pickedOptions,
  questionStatus,
  settledQuestions,
} from '@/lib/entryQuestions';
import { importanceMeta } from '@/lib/importance';
import { kindMeta } from '@/lib/kinds';
import { longRel, shortRel } from '@/lib/relTime';
import { repoLabel } from '@/lib/repoLink';
import type { Entry, EntryQuestion, Project } from '@/types/cellar';

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
  // Only the exceptions, like the app's row: `normal` is most of the cellar.
  const weight = importanceMeta(entry.importance).marked ? `(${entry.importance})` : null;
  const tail = [weight, entry.agent ? `(${entry.agent})` : null, entry.archived ? '(archived)' : null]
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
    `matters  ${entry.importance}${entry.importance === 'high' ? ' — the user marked this one as mattering more than the rest of its kind' : ''}`,
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

  out.push(...questionBlocks(entry.questions, now));

  out.push('', `asking     ${askRule(entry.kind)}`, `ask where  ${ASK_WHERE}`, `line voice ${LINE_VOICE}`);

  return out.join('\n');
}

/**
 * The questions on an entry, in the two readings that matter to an agent: what
 * is still owed an answer, and what has already been decided.
 *
 * The settled half is the point of keeping them. An agent picking a thought
 * back up needs the answer far more than it needs the question, and without it
 * it would re-ask something the user settled a week ago.
 */
function questionBlocks(questions: EntryQuestion[], now: number): string[] {
  const out: string[] = [];
  const pending = pendingQuestions(questions);
  const settled = settledQuestions(questions);

  if (pending.length > 0) {
    out.push('', 'still waiting on an answer — do not act on these:');
    for (const question of pending) {
      out.push(`  ? ${shortId(question.id)} ${question.question}  (${longRel(question.createdAt, now)})`);
      question.options.forEach((option, index) => out.push(`      ${optionLabel(index)}) ${option}`));
    }
  }

  if (settled.length > 0) {
    out.push('', 'asked and settled — build to these, do not ask again:');
    for (const question of settled) out.push(...settledLines(question, '  '));
  }

  return out;
}

/**
 * A settled question, its options, and which of them the answer took.
 *
 * The options are the part that used to be missing, and an answer printed
 * without them is sometimes unreadable rather than merely terse: an answer of
 * "c and d both" against a question whose choices were dropped is a decision
 * nobody — user or agent — can recover. So the choices are always printed back
 * with the answer, and the ones the answer names wear a tick.
 *
 * One function, used by the brief and by the answered listing, because the two
 * disagreeing about what a settled question looks like is how the gap got in.
 */
export function settledLines(question: EntryQuestion, indent: string): string[] {
  const out = [`${indent}? ${question.question}`];
  const taken = pickedOptions(question.answer, question.options);
  question.options.forEach((option, index) =>
    out.push(`${indent}  ${taken.includes(option) ? '✓' : ' '} ${optionLabel(index)}) ${option}`),
  );
  out.push(
    questionStatus(question) === 'dismissed'
      ? `${indent}= waved off${question.answer ? ` (was: ${question.answer})` : ' — they chose not to answer, so use your judgement'}`
      : `${indent}= ${question.answer ?? '(no answer recorded)'}`,
  );
  return out;
}

/** The column legend, printed once at the top of a listing. */
export const ROW_LEGEND = 'id / kind / state / age / project / thought';

/**
 * What came back while you were working.
 *
 * Printed with the answer rather than the question id, because the only useful
 * next move is to claim the entry and build to the decision — an id you would
 * have to look the answer up with is a round trip for nothing. A waved-off
 * question says so in place of an answer: it is still a decision, and the thing
 * it decides is that the judgement is yours.
 */
export function answeredBlock(
  answered: { entry: Entry; questions: EntryQuestion[] }[],
  projects: Project[],
  now = Date.now(),
): string {
  if (answered.length === 0) {
    return 'Nothing answered since you asked. Anything still blocked is waiting on the user — ask it in the chat instead if the work has run out.';
  }

  const out = [`${answered.length} answered since you asked — claim to carry on:`];
  for (const { entry, questions } of answered) {
    out.push('', entryRow(entry, projects, now));
    for (const question of questions) {
      out.push(`  ? ${question.question}`);
      out.push(
        questionStatus(question) === 'dismissed'
          ? `  = waved off${question.answer ? ` (was: ${question.answer})` : ' — use your judgement'}`
          : `  = ${question.answer ?? '(no answer recorded)'}`,
      );
    }
  }
  return out.join('\n');
}

/**
 * The same thing as a two-line tail on somebody else's result.
 *
 * The tool exists, and an agent that remembers to call it does not need this —
 * but forgetting to look is the entire failure this is here to stop, so the
 * answer goes where the agent is already reading. One line per thought and no
 * detail: enough to know something came back, not enough to derail the tool
 * call it is hanging off.
 */
export function answeredTail(
  answered: { entry: Entry; questions: EntryQuestion[] }[],
  exceptId?: string,
): string {
  const rows = answered.filter(({ entry }) => entry.id !== exceptId);
  if (rows.length === 0) return '';

  return [
    '',
    '─ answered since you asked ─',
    ...rows.map(({ entry, questions }) => `  ${shortId(entry.id)}  ${questions[0].answer ?? 'waved off'}`),
    '  → cellar_check_answers for the rest, then claim to carry on',
  ].join('\n');
}
