import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where the server gets its two pieces of configuration, and where it keeps the
 * session.
 *
 * It reads the app's own `.env` by default. That is the whole trick to setting
 * this up without a second set of credentials to paste and keep in step: the
 * URL and the anon key are already sitting next to the app that uses them, they
 * are the public pair by design, and a second copy in an MCP config file is a
 * copy that will be stale the day the project is rotated.
 */

const here = dirname(fileURLToPath(import.meta.url));

/** `<repo>/mcp/src` → `<repo>`. */
export const REPO_ROOT = resolve(here, '..', '..');

/**
 * The session lives outside the repo. It holds a refresh token, and a token in
 * a working tree is a token one `git add -A` away from a public remote.
 */
export const SESSION_DIR = join(homedir(), '.cellar-mcp');
export const SESSION_FILE = join(SESSION_DIR, 'session.json');

export type Config = { url: string; anonKey: string };

function fromDotEnv(path: string): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return {};
  }

  const values: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return values;
}

/**
 * Environment first so an MCP config can override, then the app's `.env`.
 *
 * Throws with the fix in the message rather than returning null: every caller
 * would otherwise have to invent its own version of the same sentence, and this
 * is the error a first run actually hits.
 */
export function loadConfig(): Config {
  const dotenv = fromDotEnv(join(REPO_ROOT, '.env'));
  const url = process.env.CELLAR_SUPABASE_URL ?? dotenv.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.CELLAR_SUPABASE_ANON_KEY ?? dotenv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      `No Supabase URL or anon key. Expected them in ${join(REPO_ROOT, '.env')} as ` +
        'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY, or in the environment as ' +
        'CELLAR_SUPABASE_URL / CELLAR_SUPABASE_ANON_KEY.',
    );
  }

  return { url, anonKey };
}

/**
 * What the agent calls itself on the entries it touches.
 *
 * Set `CELLAR_AGENT` per MCP config when more than one thing is working the
 * same cellar; the default is right for the single-assistant case and means one
 * less thing to configure.
 */
export function agentName(): string {
  return (process.env.CELLAR_AGENT ?? 'claude').trim().slice(0, 40) || 'claude';
}
