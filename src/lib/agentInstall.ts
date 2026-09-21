/**
 * The line you paste into a terminal to put the skill on a machine.
 *
 * The MCP config tells an agent how to reach the cellar; this tells it how to
 * work one — the loop, when to ask instead of guessing, the voice the lines are
 * written in, and the three lookup commands. Both are needed and only one of
 * them used to be copyable, which meant the skill only ever reached machines
 * that had cloned the repo.
 *
 * Served as static files by the web build (`scripts/sync-skill.mjs` copies
 * `mcp/skill/` into `public/`), so it is the deploy that publishes them and
 * there is no second thing to keep in step.
 */

import { mcpEndpoint } from '@/lib/agentConfig';

/**
 * Where the files live. Hosting is a fixed address for a fixed project, and the
 * string has to appear verbatim in something the user pastes, so it is written
 * once here rather than assembled from an origin the app does not have on
 * Android.
 */
export const SKILL_HOME = 'https://cellar-stash.web.app/skill';

export type Shell = 'powershell' | 'sh';

/**
 * One command per shell rather than one clever command for both.
 *
 * There is no line that runs in PowerShell and in sh, and the failure when you
 * paste the wrong one is not a clean error — `irm … | iex` in bash is a syntax
 * error, but `curl … | sh` in PowerShell downloads the file and does nothing
 * with it, which looks like it worked. Naming the platform on the button is
 * cheaper than that.
 */
export function skillInstall(shell: Shell, base: string = SKILL_HOME): string {
  const home = base.trim().replace(/\/+$/, '');
  return shell === 'powershell'
    ? `irm ${home}/install.ps1 | iex`
    : `curl -fsSL ${home}/install.sh | sh`;
}

/**
 * The whole setup in one line: the server registered and the skill installed,
 * with the token already in it.
 *
 * Setting up an agent used to be three copies and a config file to find — the
 * token, the JSON block it goes in, and the skill install. The installer takes
 * the token now and writes the MCP entry itself, so there is no `claude` CLI
 * to have, no file to open, and nothing to paste in the right place.
 *
 * Environment variables rather than arguments because a script read off a pipe
 * has no argv: `iex` is running text and `sh` is running a stream, and neither
 * one's own arguments are the script's.
 *
 * Single quotes around the values are safe rather than lucky — a minted token
 * is `clr_` and 64 hex characters (`cellar_create_agent_token`), and the
 * endpoint is a URL this app built. Neither can carry a quote out of here.
 */
export function fullSetup(
  shell: Shell,
  supabaseUrl: string,
  token: string,
  base: string = SKILL_HOME,
): string {
  const home = base.trim().replace(/\/+$/, '');
  const url = mcpEndpoint(supabaseUrl);
  const clean = token.trim();
  return shell === 'powershell'
    ? `$env:CELLAR_TOKEN='${clean}'; $env:CELLAR_MCP_URL='${url}'; irm ${home}/install.ps1 | iex`
    : `curl -fsSL ${home}/install.sh | CELLAR_TOKEN='${clean}' CELLAR_MCP_URL='${url}' sh`;
}
