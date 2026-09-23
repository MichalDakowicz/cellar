import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { deviceRule, inProgress, waitingOnYou } from '@/lib/agentWork';
import { answeredForAgent, readyToResume } from '@/lib/entryQuestions';
import { isKind } from '@/lib/kinds';
import { projectForPath, projectsUnderPath, repoLabel } from '@/lib/repoLink';
import type { Entry } from '@/types/cellar';

import { resolveEntry, resolveProject, type Cellar } from '../cellar.ts';
import { loadAgentDevice } from '../settings.ts';
import { guard, text, withCellar, type CtxProvider } from '../context.ts';
import { answeredBlock, entryBrief, entryTable, projectRow, ROW_LEGEND, shortId } from '../format.ts';

/**
 * The reads. `cellar_orient` is the one that matters.
 *
 * Every other tool here exists for a follow-up question; orient exists so the
 * first question never has to be asked at all. An agent that opens in a repo
 * should learn which project that is, what is waiting in it, and what it is
 * allowed to do, in one call — the alternative is list projects, guess which
 * one, list entries, and ask the user to confirm, which is four round trips and
 * a question the repo path already answered.
 */

const LIMIT = 40;

function orientBody(cellar: Cellar, cwd: string, phone: boolean | null): string {
  const here = projectForPath(cwd, cellar.projects);
  const below = projectsUnderPath(cwd, cellar.projects);
  const out: string[] = [`cwd      ${cwd}`];

  if (here) {
    const shelf = cellar.shelves.find((candidate) => candidate.id === here.shelfId);
    out.push(
      `project  ${here.name}  (${shortId(here.id)})`,
      `shelf    ${shelf?.name ?? '?'}`,
      `repo     ${repoLabel(here) ?? here.repoPath ?? '—'}`,
    );
  } else if (below.length > 0) {
    out.push(
      'project  none here, but this directory holds:',
      ...below.map((project) => `         ${shortId(project.id)} ${project.name} → ${project.repoPath}`),
      'Work in one of those directories, or pass its name to the other tools.',
    );
  } else {
    out.push(
      'project  no project is linked to this directory.',
      'Either this repo has no cellar project yet, or nobody has linked it. Use',
      'cellar_list_projects to see what exists, then cellar_link_repo to point one',
      'at this path — after that every session resolves it on its own.',
    );
  }

  // The user's standing answer to "may I test this on your phone", from their
  // own settings switch — so no session has to ask it.
  out.push(`phone    ${deviceRule(phone)}`);

  const mine = here ? cellar.entries.filter((entry) => entry.projectId === here.id) : cellar.entries;
  const live = mine.filter((entry) => !entry.archived);
  const open = live.filter((entry) => entry.state === 'open');
  const blocked = waitingOnYou(live);
  const doing = inProgress(live);
  const answered = readyToResume(live);

  out.push(
    '',
    `${open.length} open · ${doing.length} being worked · ${blocked.length} blocked on an answer` +
      (answered.length > 0 ? ` · ${answered.length} answered and waiting to be picked back up` : ''),
  );

  // Above the open list on purpose: a thought someone already asked about and
  // got an answer to is further along than anything untouched, and the whole
  // point of asking and moving on is that the answer gets used.
  if (answered.length > 0) {
    out.push(
      '',
      'answered since it was asked — start here, the decision is on the entry:',
      entryTable(answered.slice(0, LIMIT), cellar.projects),
    );
  }

  if (open.length > 0) {
    out.push('', `open, newest first (${ROW_LEGEND}):`, entryTable(open.slice(0, LIMIT), cellar.projects));
  }
  if (doing.length > 0) {
    out.push('', 'already claimed — leave these alone unless you are the one holding them:', entryTable(doing, cellar.projects));
  }
  if (blocked.length > 0) {
    out.push('', 'waiting on an answer from the user, do not re-claim:', entryTable(blocked, cellar.projects));
  }

  out.push(
    '',
    'Next: cellar_claim_entry <id> before doing any work on a thought. Claiming is',
    'what stops two sessions building the same thing, and it hands you the brief.',
  );

  return out.join('\n');
}

export function registerReadTools(server: McpServer, getCtx: CtxProvider): void {
  server.registerTool(
    'cellar_orient',
    {
      title: 'Orient in the cellar',
      description:
        'START HERE. Given the working directory, works out which cellar project this repo is, and lists what is ' +
        'open in it, what another agent already has, and what is blocked waiting on the user. Pass the absolute ' +
        'path you are actually working in — the project is resolved by matching it against each project\'s repo ' +
        'path, so no one has to be asked which project this is. Call this once at the start of a session in which ' +
        'you intend to work on dumped thoughts.',
      inputSchema: {
        cwd: z
          .string()
          .optional()
          .describe(
            'Absolute path of the directory you are working in. A hosted server is not standing in your repo and ' +
              'cannot guess it, so pass it; a server running on your own machine falls back to its own.',
          ),
      },
    },
    async ({ cwd }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const where = cwd?.trim() || ctx.cwd;
        if (!where) {
          return text(
            'Pass cwd. This server is hosted, so it has no working directory of its own — send the absolute path ' +
              'of the directory you are working in.',
          );
        }
        return text(orientBody(cellar, where, await loadAgentDevice(ctx.client)));
      }),
  );

  server.registerTool(
    'cellar_list_projects',
    {
      title: 'List cellar projects',
      description:
        'Every project, with what is in it and where it lives. Use it when cellar_orient found no project for the ' +
        'directory, or when you need a project name to pass to another tool.',
      inputSchema: {
        shelf: z.string().optional().describe('Only projects on this shelf, by name.'),
      },
    },
    async ({ shelf }) =>
      guard(async () => {
        const { cellar } = await withCellar(getCtx);
        const wanted = shelf?.trim().toLowerCase();
        const shelves = wanted
          ? cellar.shelves.filter((candidate) => candidate.name.toLowerCase().includes(wanted))
          : cellar.shelves;

        const blocks = shelves.map((candidate) => {
          const projects = cellar.projects.filter((project) => project.shelfId === candidate.id);
          const rows = projects.map((project) => `  ${projectRow(project, cellar.entries)}`);
          return [`${candidate.name}:`, ...(rows.length > 0 ? rows : ['  (no projects)'])].join('\n');
        });

        return text(blocks.length > 0 ? blocks.join('\n\n') : 'No shelves.');
      }),
  );

  server.registerTool(
    'cellar_list_entries',
    {
      title: 'List cellar entries',
      description:
        'Filtered thoughts, one per line. Every filter is optional and they combine. Archived entries are excluded ' +
        'unless you ask for them — archived means the user put it away on purpose.',
      inputSchema: {
        project: z
          .string()
          .optional()
          .describe('Project name or id. "inbox" for thoughts with no project, "all" for everything. Default: all.'),
        kinds: z
          .array(z.string())
          .optional()
          .describe('idea | removal | glitch | question | research | copy | design'),
        states: z.array(z.string()).optional().describe('open | doing | blocked | done | dropped'),
        search: z.string().optional().describe('Substring of the thought or any of its lines.'),
        archived: z.boolean().optional().describe('Include archived entries. Default false.'),
        limit: z.number().int().min(1).max(200).optional().describe('Default 40.'),
      },
    },
    async ({ project, kinds, states, search, archived, limit }) =>
      guard(async () => {
        const { cellar } = await withCellar(getCtx);
        let rows: Entry[] = cellar.entries;

        const where = project?.trim().toLowerCase();
        if (where === 'inbox') rows = rows.filter((entry) => entry.projectId === null);
        else if (where && where !== 'all') {
          const found = resolveProject(where, cellar.projects);
          rows = rows.filter((entry) => entry.projectId === found.id);
        }

        if (!archived) rows = rows.filter((entry) => !entry.archived);
        if (kinds?.length) {
          const wanted = new Set(kinds.filter(isKind));
          rows = rows.filter((entry) => wanted.has(entry.kind));
        }
        if (states?.length) {
          const wanted = new Set(states.map((state) => state.toLowerCase()));
          rows = rows.filter((entry) => wanted.has(entry.state));
        }
        if (search?.trim()) {
          const needle = search.trim().toLowerCase();
          rows = rows.filter(
            (entry) =>
              entry.text.toLowerCase().includes(needle) ||
              entry.lines.some((line) => line.text.toLowerCase().includes(needle)),
          );
        }

        const capped = rows.slice(0, limit ?? LIMIT);
        const note = rows.length > capped.length ? `\n\n(${rows.length - capped.length} more not shown)` : '';
        return text(`${ROW_LEGEND}\n${entryTable(capped, cellar.projects)}${note}`);
      }),
  );

  server.registerTool(
    'cellar_check_answers',
    {
      title: 'Check whether your questions have been answered',
      description:
        'The other end of cellar_ask: the questions YOU put on entries that the user has since answered or waved ' +
        'off, with what they said. Takes nothing — it is scoped to your own agent name.\n\n' +
        'Call it whenever you finish a thought and are about to pick up the next one, and always before you end ' +
        'the session. An answer arrives while you are working on something else and nothing interrupts you to say ' +
        'so, which is the whole reason this tool exists. An answered entry is back to open, so claim it and carry ' +
        'on from the decision. Anything still unanswered when the work runs out is a question to ask in the chat, ' +
        'then record with cellar_answer_question.',
      inputSchema: {},
    },
    async () =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const answered = answeredForAgent(
          cellar.entries.filter((entry) => !entry.archived),
          ctx.agent,
        );
        return text(answeredBlock(answered, cellar.projects));
      }),
  );

  server.registerTool(
    'cellar_get_entry',
    {
      title: 'Read one entry in full',
      description:
        'The whole thought: what was dumped, what the user added since, what has already been reported back, which ' +
        'repo it belongs to, what this kind of thought is asking of you, and when to stop and ask instead of ' +
        'guessing. Reading does not claim it — call cellar_claim_entry before you change anything.',
      inputSchema: { entry: z.string().describe('Entry id, or the short id from a listing.') },
    },
    async ({ entry }) =>
      guard(async () => {
        const { cellar } = await withCellar(getCtx);
        return text(entryBrief(resolveEntry(entry, cellar.entries), cellar));
      }),
  );
}
