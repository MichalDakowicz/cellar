import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { canClaim, LINE_VOICE } from '@/lib/agentWork';
import { isKind } from '@/lib/kinds';
import { normalizeRepoPath, normalizeRepoUrl, repoLabel } from '@/lib/repoLink';
import type { Kind } from '@/types/cellar';

import {
  addAgentLine,
  archiveEntry,
  claimEntry,
  createEntry,
  linkRepo,
  resolveEntry,
  resolveProject,
  setEntryState,
} from '../cellar.ts';
import { guard, text, withCellar, type CtxProvider } from '../context.ts';
import { entryBrief, shortId } from '../format.ts';

/**
 * The writes, and the shape of the loop they make:
 *
 *   claim → work → append lines → finish (done | dropped)
 *                              ↘ ask → blocked, and stop
 *
 * Three things are deliberately missing. There is no delete — nothing in this
 * app is destroyed to get it out of the way, so the strongest thing here is
 * archive, and archive comes back. There is no "set state to anything" — the
 * states an agent may move an entry to are exactly the ones these tools name.
 * And there is no way to edit the thought itself: an entry stays the one line
 * it was dumped as, forever, and everything an agent has to say about it is an
 * appended line.
 */

export function registerWriteTools(server: McpServer, getCtx: CtxProvider): void {
  server.registerTool(
    'cellar_claim_entry',
    {
      title: 'Claim an entry',
      description:
        'Take an open thought before working on it, and get the full brief back. Claiming is atomic: if another ' +
        'session already has it you are told who, and you must pick something else rather than working it anyway. ' +
        'Claim exactly one entry at a time and finish it before claiming the next.',
      inputSchema: { entry: z.string().describe('Entry id, or the short id from a listing.') },
    },
    async ({ entry }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);

        if (!canClaim(target)) {
          const why = target.archived
            ? 'it is archived — the user put it away on purpose'
            : `it is ${target.state}${target.agent ? ` and ${target.agent} has it` : ''}`;
          return text(`Cannot claim ${shortId(target.id)}: ${why}. Pick another entry.`);
        }

        const claim = await claimEntry(ctx.client, target, ctx.agent);
        if (!claim.ok) {
          return text(
            `Lost the race for ${shortId(target.id)} — it is now ${claim.entry.state}` +
              `${claim.entry.agent ? ` and ${claim.entry.agent} has it` : ''}. Pick another entry.`,
          );
        }

        return text(
          [
            `Claimed as "${ctx.agent}". It is now doing, and the user sees your name on it.`,
            '',
            entryBrief(claim.entry, cellar),
            '',
            'When you are done: cellar_finish_entry. If you cannot answer something from the',
            'repo: cellar_ask, which stops the work and puts the question in front of the user.',
          ].join('\n'),
        );
      }),
  );

  server.registerTool(
    'cellar_append_line',
    {
      title: 'Report back on an entry',
      description:
        `Add one line of findings to an entry. This is how work gets reported: ${LINE_VOICE}. It is collapsed to a ` +
        'single line and capped, so do not send a paragraph — send the sentence that would be worth reading in six ' +
        'months. Use one line per real finding rather than one long one, and do not narrate progress.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        text: z.string().describe('One line, lowercase, no full stop.'),
      },
    },
    async ({ entry, text: body }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        const written = await addAgentLine(ctx.client, ctx.userId, target.id, body);
        return text(`Added to ${shortId(target.id)}:\n> ${written}`);
      }),
  );

  server.registerTool(
    'cellar_ask',
    {
      title: 'Ask the user about an entry, and stop',
      description:
        'Put a question on the entry and block it. THIS IS A CORRECT OUTCOME, not a failure — for an idea or a ' +
        'removal it is usually the right one. A dumped thought is one line and the decisions behind it were never ' +
        'written down, so anything with two plausible readings that lead to different work is a question, not a ' +
        'guess. The entry goes to blocked, shows up in the user\'s inbox, and nothing else should be done on it ' +
        'until they answer. Ask one concrete question naming the options you are choosing between.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        question: z.string().describe('One line. Name the options rather than asking an open question.'),
      },
    },
    async ({ entry, question }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        const written = await addAgentLine(ctx.client, ctx.userId, target.id, question);
        await setEntryState(ctx.client, target.id, 'blocked', ctx.agent);
        return text(
          `${shortId(target.id)} is blocked, waiting on the user:\n> ${written}\n\n` +
            'It is in their inbox now. Do not keep working this entry — move to another one or stop.',
        );
      }),
  );

  server.registerTool(
    'cellar_finish_entry',
    {
      title: 'Finish an entry',
      description:
        'Settle a claimed entry as done or dropped, with one line saying what happened. "done" means the thought ' +
        'has been acted on; "dropped" means it should not be — it is stale, already true, or the user decided ' +
        'against it. Never mark something done that you did not actually finish; leaving it blocked with a ' +
        'question is always better than a done entry the user has to discover was not.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        outcome: z.enum(['done', 'dropped']),
        note: z.string().describe('One line: what changed, or why it was dropped.'),
      },
    },
    async ({ entry, outcome, note }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        const written = await addAgentLine(ctx.client, ctx.userId, target.id, note);
        // The name comes off with the claim: nobody is on it any more.
        await setEntryState(ctx.client, target.id, outcome, null);
        return text(`${shortId(target.id)} is ${outcome}:\n> ${written}`);
      }),
  );

  server.registerTool(
    'cellar_unclaim_entry',
    {
      title: 'Put an entry back',
      description:
        'Return a claimed entry to open without settling it — you ran out of context, the user asked for something ' +
        'else, or it turned out to be someone else\'s to do. Leaves it exactly as it was found, plus your note if ' +
        'you give one.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        note: z.string().optional().describe('One line: how far you got, if that is worth knowing.'),
      },
    },
    async ({ entry, note }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        if (note?.trim()) await addAgentLine(ctx.client, ctx.userId, target.id, note);
        await setEntryState(ctx.client, target.id, 'open', null);
        return text(`${shortId(target.id)} is open again.`);
      }),
  );

  server.registerTool(
    'cellar_create_entry',
    {
      title: 'Drop a new thought',
      description:
        'Catch something you found while working that is worth keeping but is not this entry — a second bug beside ' +
        'the one you fixed, a question the code raised. It lands open, stamped with your name, for the user to ' +
        'triage; it is never yours to claim straight back. One line, in their voice: ' +
        LINE_VOICE +
        '. Do not use this to log what you did — that is cellar_append_line on the entry you are working.',
      inputSchema: {
        text: z.string().describe('One line.'),
        kind: z
          .enum(['idea', 'removal', 'glitch', 'question', 'research', 'copy', 'design'])
          .describe('What sort of thought it is.'),
        project: z.string().optional().describe('Project name or id. Omitted means the inbox.'),
      },
    },
    async ({ text: body, kind, project }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = project?.trim() ? resolveProject(project, cellar.projects) : null;
        const created = await createEntry(ctx.client, ctx.userId, {
          text: body,
          kind: (isKind(kind) ? kind : 'idea') as Kind,
          projectId: target?.id ?? null,
          agent: ctx.agent,
        });
        return text(`Dropped ${shortId(created.id)} into ${target?.name ?? 'the inbox'}:\n${created.text}`);
      }),
  );

  server.registerTool(
    'cellar_archive_entry',
    {
      title: 'Archive an entry',
      description:
        'Put a thought away — it is already true, it was fixed elsewhere, or it no longer applies. It stays ' +
        'searchable and the user can bring it back in one tap. There is deliberately no way to delete an entry. ' +
        'The reason is required and is written onto the entry, because an entry that vanished from a list with no ' +
        'explanation is indistinguishable from a bug.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        reason: z.string().describe('One line: why it no longer needs to be there.'),
      },
    },
    async ({ entry, reason }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        const written = await addAgentLine(ctx.client, ctx.userId, target.id, reason);
        await archiveEntry(ctx.client, target.id);
        return text(`${shortId(target.id)} is archived:\n> ${written}`);
      }),
  );

  server.registerTool(
    'cellar_link_repo',
    {
      title: 'Point a project at a checkout',
      description:
        'Record where a project lives, so that every future session in that directory resolves it without asking. ' +
        'Do this the first time cellar_orient finds no project for a repo that clearly has one — it is the single ' +
        'change that removes the "which project is this?" question permanently. The path is the one that matters; ' +
        'the remote is only used for opening a link from the app.',
      inputSchema: {
        project: z.string().describe('Project name or id.'),
        repo_path: z.string().optional().describe('Absolute path of the checkout, e.g. C:\\ping\\cellar.'),
        repo_url: z.string().optional().describe('Remote, e.g. github.com/you/cellar.'),
      },
    },
    async ({ project, repo_path, repo_url }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveProject(project, cellar.projects);
        const linked = await linkRepo(ctx.client, target.id, {
          repoPath: normalizeRepoPath(repo_path) ?? target.repoPath,
          repoUrl: normalizeRepoUrl(repo_url) ?? target.repoUrl,
        });
        return text(
          `${linked.name} → ${linked.repoPath ?? '(no path)'}${linked.repoUrl ? ` · ${repoLabel(linked)}` : ''}`,
        );
      }),
  );
}
