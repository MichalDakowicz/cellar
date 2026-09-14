/**
 * What you paste into an agent to point it at the hosted cellar.
 *
 * Pure, and here rather than in the settings screen, because it is the one
 * thing in this flow that is easy to get subtly wrong and impossible to notice:
 * a config with the right token and a URL missing `/functions/v1` fails with an
 * unhelpful 404 long after the token was copied and the screen was closed.
 */

/** `https://<ref>.supabase.co` → the function's URL. Trailing slashes are forgiven. */
export function mcpEndpoint(supabaseUrl: string): string {
  return `${supabaseUrl.trim().replace(/\/+$/, '')}/functions/v1/mcp`;
}

/**
 * The block an agent's config file wants, with the token already in it.
 *
 * `x-cellar-agent` is what the entries will be stamped with, so it is spelled
 * out rather than left to the default: two agents on one cellar and a list that
 * says "claude" twice is a list that cannot tell you who has what.
 */
export function mcpConfig(supabaseUrl: string, token: string, agent = 'claude'): string {
  return JSON.stringify(
    {
      mcpServers: {
        cellar: {
          type: 'http',
          url: mcpEndpoint(supabaseUrl),
          headers: { Authorization: `Bearer ${token}`, 'x-cellar-agent': agent },
        },
      },
    },
    null,
    2,
  );
}
