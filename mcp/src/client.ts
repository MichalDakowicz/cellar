import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

import { loadConfig, SESSION_DIR, SESSION_FILE } from './config.ts';

/**
 * One Supabase client, signed in as you, with the session on disk.
 *
 * **It uses the anon key and a real user session — never the service role.**
 * Cellar's tables are owner-only RLS keyed to `auth.uid()`, and that policy is
 * the only thing standing between a prompt-injected agent and every row in a
 * database four other apps also live in. A service key would hand an agent
 * Radar's profiles and the shared `user_settings` as well, so the one rule this
 * file exists to hold is: the agent gets exactly your access and no more.
 *
 * The session file is the refresh token, so it is written 0600 and kept in the
 * home directory rather than the repo.
 */

type StoredSession = { access_token: string; refresh_token: string };

function readSession(): StoredSession | null {
  try {
    const parsed = JSON.parse(readFileSync(SESSION_FILE, 'utf8')) as Partial<StoredSession>;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return { access_token: parsed.access_token, refresh_token: parsed.refresh_token };
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  mkdirSync(SESSION_DIR, { recursive: true });
  writeFileSync(SESSION_FILE, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 });
  try {
    chmodSync(SESSION_FILE, 0o600);
  } catch {
    // Windows has no mode bits worth setting; the file still sits in the
    // user's own profile directory.
  }
}

export function clearSession(): void {
  rmSync(SESSION_FILE, { force: true });
}

export function createCellarClient(): SupabaseClient {
  const { url, anonKey } = loadConfig();
  return createClient(url, anonKey, {
    auth: {
      // The server owns persistence itself — it has a session file, not a
      // browser, and supabase-js's default storage would look for localStorage.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * A client for the login command only.
 *
 * PKCE needs somewhere to keep the code verifier between starting the flow and
 * exchanging the code for a session. That is one process and a few seconds, so
 * a Map is the right storage — and it means the verifier never touches disk.
 */
export function createAuthClient(): SupabaseClient {
  const { url, anonKey } = loadConfig();
  const memory = new Map<string, string>();
  return createClient(url, anonKey, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => void memory.set(key, value),
        removeItem: (key) => void memory.delete(key),
      },
    },
  });
}

export class NotSignedIn extends Error {
  constructor() {
    super(
      'This Cellar MCP server is not signed in. Run `npm run login` in cellar/mcp and retry — ' +
        'it takes the email and password of the account the app uses. If that account was created with ' +
        'Google it has no password yet; the app settings screen has a "password for agent tools" block ' +
        'that sets one. Never ask the user for their password yourself; the login command reads it directly.',
    );
    this.name = 'NotSignedIn';
  }
}

/**
 * A signed-in client and the account id everything is written against.
 *
 * The stored session is refreshed on every server start rather than trusted:
 * an access token lives an hour and the server is long-lived, so the refresh
 * token on disk is the only thing that is reliably still good. The rotated pair
 * is written straight back, which is also what keeps the session alive across
 * restarts without another login.
 */
export async function signedIn(): Promise<{ client: SupabaseClient; userId: string }> {
  const stored = readSession();
  if (!stored) throw new NotSignedIn();

  const client = createCellarClient();
  const { data, error } = await client.auth.setSession(stored);
  if (error || !data.session || !data.user) throw new NotSignedIn();

  writeSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });

  return { client, userId: data.user.id };
}
