import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

import { handleMessage } from '@cellar/mcp/httpTransport.ts';

import { contextForToken, NotAuthorized } from './auth.ts';

/**
 * The cellar over MCP, for an agent that is not on your machine.
 *
 * Same tools as `mcp/src/server.ts` and the same file defines them — this is
 * the transport and the door, nothing else. What is different is who is asking:
 * a local server is you by definition, and this one has to be told, so every
 * request carries an agent token and the context is built from it and thrown
 * away again.
 *
 * Deployed with `verify_jwt = false` (supabase/config.toml), because the header
 * holds a cellar token and not a Supabase JWT — the platform would reject it at
 * the door before this file ever ran. The check it replaces is the one in
 * `auth.ts`, and it is stricter: the platform's only asks whether a JWT is
 * valid, this asks whether a token is one of yours and has not been revoked.
 */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, x-cellar-agent',
  'access-control-allow-methods': 'POST, OPTIONS',
};

const JSON_HEADERS = { ...CORS, 'content-type': 'application/json' };

function rpcError(id: unknown, code: number, message: string, status: number): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }), {
    status,
    headers: JSON_HEADERS,
  });
}

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // There is no stream to open and no session to resume, so a GET has nothing
  // to do here — say so rather than returning an empty 200 that reads as a
  // working server with no tools.
  if (request.method !== 'POST') {
    return rpcError(null, -32600, 'POST a JSON-RPC message. This server does not stream.', 405);
  }

  const token = bearer(request);
  if (!token) {
    return rpcError(
      null,
      -32001,
      'No agent token. Send it as "Authorization: Bearer <token>" — mint one in the app under settings → agent access.',
      401,
    );
  }

  let body: JSONRPCMessage | JSONRPCMessage[];
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, 'Body is not JSON.', 400);
  }

  const agent = (request.headers.get('x-cellar-agent') ?? 'claude').trim().slice(0, 40) || 'claude';

  // Resolved once per request and shared by every message in a batch: they are
  // all the same caller, and one round trip to check the token is enough.
  let getCtx: Awaited<ReturnType<typeof makeProvider>>;
  try {
    getCtx = await makeProvider(token, agent);
  } catch (error) {
    if (error instanceof NotAuthorized) return rpcError(null, -32001, error.message, 401);
    return rpcError(null, -32603, error instanceof Error ? error.message : String(error), 500);
  }

  const messages = Array.isArray(body) ? body : [body];
  const replies: JSONRPCMessage[] = [];
  for (const message of messages) {
    const reply = await handleMessage(getCtx, message);
    if (reply) replies.push(reply);
  }

  // Nothing to say back means it was a notification. 202 is what the spec asks
  // for, and an empty 200 with a JSON content type is what breaks clients.
  if (replies.length === 0) return new Response(null, { status: 202, headers: CORS });

  return new Response(JSON.stringify(Array.isArray(body) ? replies : replies[0]), {
    status: 200,
    headers: JSON_HEADERS,
  });
});

/**
 * The token is checked before the first message is handled, not lazily inside a
 * tool: a bad token should be a 401 on the request, not an error string in a
 * tool result that an agent will try to work around.
 */
async function makeProvider(token: string, agent: string) {
  const ctx = await contextForToken(token, agent);
  return async () => ctx;
}
