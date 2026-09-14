import type { SupabaseClient } from '@supabase/supabase-js';

import { agentName } from './config.ts';
import { loadCellar, type Cellar } from './cellar.ts';
import { signedIn } from './client.ts';

/**
 * What every tool needs, worked out once.
 *
 * The sign-in is deliberately lazy. A server that threw on startup because
 * nobody had logged in yet would show up in the client as a broken MCP server
 * with no tools and no explanation; this way the tools are all there and the
 * first call says exactly what to run.
 */

export type Ctx = { client: SupabaseClient; userId: string; agent: string };

let pending: Promise<{ client: SupabaseClient; userId: string }> | null = null;

export async function context(): Promise<Ctx> {
  // Retried rather than cached on failure: the fix is to run the login command,
  // and the next tool call after that should just work.
  if (!pending) pending = signedIn().catch((error) => ((pending = null), Promise.reject(error)));
  const { client, userId } = await pending;
  return { client, userId, agent: agentName() };
}

export async function withCellar(): Promise<{ ctx: Ctx; cellar: Cellar }> {
  const ctx = await context();
  return { ctx, cellar: await loadCellar(ctx.client) };
}

export type ToolResult = { content: { type: 'text'; text: string }[]; isError?: boolean };

export function text(body: string): ToolResult {
  return { content: [{ type: 'text', text: body }] };
}

/**
 * One error shape for every tool.
 *
 * The message is the whole value here — an agent that is told "already claimed
 * by claude" picks something else, and an agent that is told "Error" starts
 * guessing at arguments.
 */
export function guard(handler: () => Promise<ToolResult>): Promise<ToolResult> {
  return handler().catch((error: unknown) => ({
    content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }],
    isError: true,
  }));
}
