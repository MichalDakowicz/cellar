import { createClient } from '@supabase/supabase-js';

import type { Ctx } from '@cellar/mcp/context.ts';

/**
 * Turning a token in a header into "this is the owner", without ever holding a
 * service key.
 *
 * The local server has it easy: a refresh token in the home directory, and
 * supabase-js does the rest. Hosted there is no home directory and no browser,
 * and the caller is anonymous until proven otherwise — so the anon client asks
 * the one security definer function in the schema to turn a hash into a user
 * id, and then this file mints a short JWT for that user and every query after
 * it runs under the same RLS as the app.
 *
 * The service role key is never read here, and that is the point. A hosted
 * endpoint holding a key that bypasses RLS would be a key that bypasses RLS for
 * Radar's profiles and the shared user_settings too — four other apps live in
 * this database. The agent gets exactly your access and nothing more, the same
 * promise the local server makes.
 */

const encoder = new TextEncoder();

export class NotAuthorized extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotAuthorized';
  }
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * The token is hashed here and only the hash is sent, so the token itself never
 * reaches a query, a log line or a database.
 */
async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Five minutes, because it has one request to live through.
 *
 * A JWT is a bearer token and this one is minted fresh per call, so there is
 * nothing to gain by making it last: an intercepted one is expired before it is
 * worth anything, and there is no refresh, no rotation and nothing on disk.
 */
async function mintUserJwt(userId: string, secret: string): Promise<string> {
  const issued = Math.floor(Date.now() / 1000);
  const header = base64url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64url(
    encoder.encode(
      JSON.stringify({
        sub: userId,
        role: 'authenticated',
        aud: 'authenticated',
        iss: 'supabase',
        iat: issued,
        exp: issued + 300,
      }),
    ),
  );

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, encoder.encode(`${header}.${payload}`)),
  );

  return `${header}.${payload}.${base64url(signature)}`;
}

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set on this function.`);
  return value;
}

/**
 * One context per request. Nothing is cached between them: a revoked token has
 * to stop working on the next call, not on the next cold start.
 */
export async function contextForToken(token: string, agent: string): Promise<Ctx> {
  const url = required('SUPABASE_URL');
  const anonKey = required('SUPABASE_ANON_KEY');
  const secret = required('CELLAR_JWT_SECRET');

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await anon.rpc('cellar_resolve_agent_token', {
    p_hash: await sha256Hex(token),
  });
  if (error) throw new Error(`Could not check the token: ${error.message}`);
  if (!data) {
    throw new NotAuthorized(
      'Unknown, expired or revoked agent token. Mint a new one in the app under settings → agent access.',
    );
  }

  const userId = data as string;
  const jwt = await mintUserJwt(userId, secret);

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  // No cwd: this server is not standing in anyone's repo, so cellar_orient has
  // to be told where the agent is.
  return { client, userId, agent, cwd: null };
}
