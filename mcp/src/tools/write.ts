import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { canClaim, LINE_VOICE } from '@/lib/agentWork';
import { answeredForAgent, MAX_OPTIONS, optionLabel, pendingQuestions } from '@/lib/entryQuestions';
import { isKind } from '@/lib/kinds';
import { normalizeRepoPath, normalizeRepoUrl, repoLabel } from '@/lib/repoLink';
import type { Kind } from '@/types/cellar';

import {
  addAgentLine,
  answerQuestion,
  archiveEntry,
  askQuestion,
  claimEntry,
  createEntry,
  linkRepo,
  resolveEntry,
  resolveProject,
  resolveQuestion,
  setEntryState,
  type Cellar,
} from '../cellar.ts';
import { guard, text, withCellar, type CtxProvider } from '../context.ts';
import { answeredTail, entryBrief, shortId } from '../format.ts';

/**
 * The writes, and the shape of the loop they make:
 *
 *   claim → work → append lines → finish (done | dropped)
 *                              ↘ ask → blocked, and move to the next thing
 *
 * Three things are deliberately missing. There is no delete — nothing in this
 * app is destroyed to get it out of the way, so the strongest thing here is
 * archive, and archive comes back. There is no "set state to anything" — the
 * states an agent may move an entry to are exactly the ones these tools name.
 * And there is no way to edit the thought itself: an entry stays the one line
 * it was dumped as, forever, and everything an agent has to say about it is an
 * appended line.
 */

/**
 * Every write answers the question the agent forgot to ask: did anything come
 * back?
 *
 * `cellar_check_answers` is the tool for it, and an agent that remembers to
 * call it never sees this. Forgetting to look is the failure being fixed, so
 * the answer is appended to the result of whatever the agent *did* call — it is
 * reading that text anyway. The cellar snapshot predates the write, so the
 * entry being acted on is left out: finishing a thought must not print a nudge
 * to go and pick that same thought back up.
 */
function withAnswered(body: string, cellar: Cellar, agent: string, exceptId?: string): string {
  const answered = answeredForAgent(
    cellar.entries.filter((entry) => !entry.archived),
    agent,
  );
  return body + answeredTail(answered, exceptId);
}

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
          withAnswered(
            [
              `Claimed as "${ctx.agent}". It is now doing, and the user sees your name on it.`,
              '',
              entryBrief(claim.entry, cellar),
              '',
              'When you are done: cellar_finish_entry. If you cannot answer something from the',
              'repo, ask — in the chat when this session has one task, with cellar_ask when it',
              'has several, and read "ask where" above before choosing.',
            ].join('\n'),
            cellar,
            ctx.agent,
            target.id,
          ),
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
        return text(withAnswered(`Added to ${shortId(target.id)}:\n> ${written}`, cellar, ctx.agent, target.id));
      }),
  );

  server.registerTool(
    'cellar_ask',
    {
      title: 'Ask the user about an entry, then move on',
      description:
        'Put a question on the entry and block it. THIS IS A CORRECT OUTCOME, not a failure — for an idea or a ' +
        'removal it is usually the right one. A dumped thought is one line and the decisions behind it were never ' +
        'written down, so anything with two plausible readings that lead to different work is a question, not a ' +
        'guess.\n\n' +
        'WHERE TO ASK. If this session has one task, do not use this tool — ask in the chat, because the user is ' +
        'right there and blocking the only thing they asked for helps nobody. Use this when they have handed you ' +
        'several: it blocks this one thought and leaves the rest of the list workable, and the answer may well be ' +
        'there by the time you come back to it.\n\n' +
        'WHEN TO ASK. The moment you know, never at the end of the session. The question is worth nothing until it ' +
        'is in their inbox, and a session that ends before you write it takes it with it.\n\n' +
        'Ask one concrete question, and pass `options` whenever you are choosing between named alternatives — the ' +
        'user answers those with a single tap. Nothing interrupts you when the answer lands, so call ' +
        'cellar_check_answers as you finish each thought and again before you end the session: if the answer is ' +
        'still missing then, ask the same question in the chat and record it with cellar_answer_question.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        question: z
          .string()
          .describe('One line. Name what you are choosing between rather than asking an open question.'),
        options: z
          .array(z.string())
          .max(MAX_OPTIONS)
          .optional()
          .describe(
            `The alternatives, one line each, at most ${MAX_OPTIONS}. Rendered as a/b/c/d tap targets in the app, ` +
              'so prefer them to asking the user to type. Omit only when the answer cannot be a choice.',
          ),
      },
    },
    async ({ entry, question, options }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        const asked = await askQuestion(ctx.client, ctx.userId, target.id, {
          question,
          options: options ?? [],
          agent: ctx.agent,
        });

        return text(
          withAnswered(
            [
              `${shortId(target.id)} is blocked, waiting on the user:`,
              `  ? ${shortId(asked.id)} ${asked.question}`,
              ...asked.options.map((option, index) => `      ${optionLabel(index)}) ${option}`),
              '',
              'It is in their inbox now. Move to the next task — do not keep working this entry, and do not sit',
              'waiting on it. cellar_check_answers when you finish the next thought, and again before you end the',
              'session: an answer that arrived is yours to pick back up. If it never does, ask the same question in',
              'the chat and record what they say with cellar_answer_question.',
            ].join('\n'),
            cellar,
            ctx.agent,
            target.id,
          ),
        );
      }),
  );

  server.registerTool(
    'cellar_answer_question',
    {
      title: 'Record an answer the user gave in the chat',
      description:
        'The other half of cellar_ask. You asked on the entry, the work ran out before an answer arrived, so you ' +
        'asked the same question in the chat — this writes what they said back onto the question, so the entry ' +
        'keeps the pair and the decision does not live only in a conversation that is gone.\n\n' +
        'It unblocks the entry when this was the last question outstanding, which leaves it open for you to claim ' +
        'again. Only ever record what the user actually said: an answer you reasoned out yourself is a guess with ' +
        'their name on it.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        question: z
          .string()
          .optional()
          .describe('Question id, from the entry brief. Omit when only one question is outstanding.'),
        answer: z.string().describe('One line: what the user chose, in their words.'),
      },
    },
    async ({ entry, question, answer }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        const pending = pendingQuestions(target.questions);

        // Naming the question is optional while only one is waiting, which is
        // the common case — and refused rather than guessed when it is not.
        const chosen = question?.trim()
          ? resolveQuestion(question, target.questions)
          : pending.length === 1
            ? pending[0]
            : null;

        if (!chosen) {
          throw new Error(
            pending.length === 0
              ? `${shortId(target.id)} has no question waiting on an answer.`
              : `${shortId(target.id)} has ${pending.length} questions waiting. Pass the one you mean: ` +
                pending.map((one) => shortId(one.id)).join(', '),
          );
        }

        const written = await answerQuestion(ctx.client, target, chosen.id, answer);
        const left = pending.filter((one) => one.id !== chosen.id).length;
        return text(
          `Recorded on ${shortId(target.id)}:\n  ? ${written.question}\n  = ${written.answer}\n\n` +
            (left > 0
              ? `${left} more still waiting, so the entry stays blocked.`
              : 'That was the last one, so the entry is open again — claim it to carry on.'),
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
        return text(withAnswered(`${shortId(target.id)} is ${outcome}:\n> ${written}`, cellar, ctx.agent, target.id));
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
        return text(withAnswered(`${shortId(target.id)} is open again.`, cellar, ctx.agent, target.id));
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
        return text(withAnswered(`${shortId(target.id)} is archived:\n> ${written}`, cellar, ctx.agent, target.id));
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
