import type { SupabaseClient } from '@supabase/supabase-js';

import { loadCellar, type Cellar } from './cellar.ts';

/**
 * What every tool needs, and the one thing that is not the same in the two
 * places this server runs.
 *
 * On your machine it is one signed-in client for the life of the process, read
 * from the session file, standing in a directory. Hosted it is a fresh client
 * per request, built from the token in the header, with no session file and no
 * working directory to speak of. So the tools are handed a provider rather than
 * calling a module singleton: everything transport-shaped stays at the edges,
 * and a tool never learns which of the two it is running in.
 */

export type Ctx = {
  client: SupabaseClient;
  userId: string;
  agent: string;
  /** Where the server itself is standing, when that means anything. Null hosted. */
  cwd: string | null;
};

export type CtxProvider = () => Promise<Ctx>;

export async function withCellar(getCtx: CtxProvider): Promise<{ ctx: Ctx; cellar: Cellar }> {
  const ctx = await getCtx();
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
