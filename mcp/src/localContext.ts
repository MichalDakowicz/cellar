import type { SupabaseClient } from '@supabase/supabase-js';

import { signedIn } from './client.ts';
import { agentName } from './config.ts';
import type { Ctx } from './context.ts';

/**
 * The provider for the server that runs on your machine: one sign-in, reused
 * for the life of the process, from the session file `npm run login` wrote.
 *
 * The sign-in is deliberately lazy. A server that threw on startup because
 * nobody had logged in yet would show up in the client as a broken MCP server
 * with no tools and no explanation; this way the tools are all there and the
 * first call says exactly what to run.
 *
 * This file is the node half of the server and nothing hosted may import it —
 * it reaches for a home directory and a process. See `functionContext.ts` in
 * the edge function for the other half.
 */

let pending: Promise<{ client: SupabaseClient; userId: string }> | null = null;

export async function localContext(): Promise<Ctx> {
  // Retried rather than cached on failure: the fix is to run the login command,
  // and the next tool call after that should just work.
  if (!pending) pending = signedIn().catch((error) => ((pending = null), Promise.reject(error)));
  const { client, userId } = await pending;
  return { client, userId, agent: agentName(), cwd: process.cwd() };
}
