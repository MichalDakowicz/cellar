import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { canUnclaim, reopenPlan } from '@/lib/agentWork';
import { patchEvents } from '@/lib/entryTrail';

import {
  addAgentLine,
  archiveEntry,
  reopenEntry,
  resolveEntry,
  setEntryState,
} from '../cellar.ts';
import { byAgent, logMoves } from '../trail.ts';
import { guard, text, withAnswered, withCellar, type CtxProvider } from '../context.ts';
import { shortId } from '../format.ts';

/**
 * Putting a thought down, and picking one back up after it was put down.
 *
 *   doing → finish → done | dropped
 *   doing → unclaim → open
 *   done | dropped | archived → reopen → open
 *   anything → archive → archived
 *
 * Reopen is the one that was missing. An agent told "that one is not actually
 * done" had no tool that said so — finish only goes forward, claim only takes
 * an open thought, and the only door back was unclaim, which wrote open over
 * whatever it was pointed at without looking. Now unclaim is for a claim and
 * reopen is for a settled thought, and each says which one you wanted when you
 * reach for the wrong one.
 */

export function registerSettleTools(server: McpServer, getCtx: CtxProvider): void {
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
        await logMoves(ctx.client, ctx.userId, target.id, patchEvents(target, { state: outcome }, byAgent(ctx.agent)));
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
        'you give one. Only for an entry that is doing: a done or dropped one comes back with cellar_reopen_entry.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        note: z.string().optional().describe('One line: how far you got, if that is worth knowing.'),
      },
    },
    async ({ entry, note }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        if (!canUnclaim(target)) {
          return text(
            `${shortId(target.id)} is ${target.state}, not claimed, so there is nothing to put back.` +
              (target.state === 'done' || target.state === 'dropped' ? ' To bring it back: cellar_reopen_entry.' : ''),
          );
        }
        if (note?.trim()) await addAgentLine(ctx.client, ctx.userId, target.id, note);
        await setEntryState(ctx.client, target.id, 'open', null);
        await logMoves(ctx.client, ctx.userId, target.id, [
          { what: 'released', fromValue: 'doing', toValue: 'open', ...byAgent(ctx.agent) },
        ]);
        return text(withAnswered(`${shortId(target.id)} is open again.`, cellar, ctx.agent, target.id));
      }),
  );

  server.registerTool(
    'cellar_reopen_entry',
    {
      title: 'Reopen an entry',
      description:
        'Bring a done, dropped or archived thought back to open — the fix did not hold, it was dropped by mistake, ' +
        'the user wants it on the list again. Reach for it when the user asks, or when you find that a thought ' +
        'marked done is not; never to take a settled thought for yourself. The reason is required and is written ' +
        'onto the entry, the same as archiving, so the thread says why it came back. It lands open with nobody on ' +
        'it: claim it if it is yours to work.',
      inputSchema: {
        entry: z.string().describe('Entry id, or the short id from a listing.'),
        reason: z.string().describe('One line: why it is coming back.'),
      },
    },
    async ({ entry, reason }) =>
      guard(async () => {
        const { ctx, cellar } = await withCellar(getCtx);
        const target = resolveEntry(entry, cellar.entries);
        const plan = reopenPlan(target);
        if (!plan.ok) return text(`Cannot reopen ${shortId(target.id)}: ${plan.why}.`);

        const written = await addAgentLine(ctx.client, ctx.userId, target.id, reason);
        const back = await reopenEntry(ctx.client, target.id, plan.patch);
        await logMoves(ctx.client, ctx.userId, target.id, patchEvents(target, plan.patch, byAgent(ctx.agent)));
        return text(
          withAnswered(`${shortId(target.id)} is ${back.state} again:\n> ${written}`, cellar, ctx.agent, target.id),
        );
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
        await logMoves(ctx.client, ctx.userId, target.id, patchEvents(target, { archived: true }, byAgent(ctx.agent)));
        return text(withAnswered(`${shortId(target.id)} is archived:\n> ${written}`, cellar, ctx.agent, target.id));
      }),
  );
}
