import { shell } from 'electron';
import { createServer } from 'node:http';

/**
 * Google sign-in for the window, done the way a desktop app is meant to: in
 * the real browser, with the answer coming back to a loopback address
 * (RFC 8252). Google refuses to sign in inside an embedded browser, and a popup
 * inside the window could not come back to `cellar-desk://` anyway — Supabase
 * only redirects to addresses on its allow-list.
 *
 * The window starts the flow itself (`signInWithOAuth`, PKCE, redirect to the
 * loopback) so the code verifier stays in its own storage; this only opens the
 * link and hands back the code that lands on the loopback. It is the same
 * address the MCP server's `npm run login -- --google` uses, so one entry on
 * Supabase's redirect list covers both.
 */

export const OAUTH_PORT = 54545;
export const OAUTH_CALLBACK = `http://127.0.0.1:${OAUTH_PORT}/callback`;

const WAIT_MS = 3 * 60_000;

const PAGE = `<!doctype html><meta charset="utf-8"><title>cellar</title>
<body style="background:#09090b;color:#fafafa;font:16px system-ui;display:flex;height:100vh;align-items:center;justify-content:center">
<p>signed in — go back to cellar. this tab can close.</p></body>`;

export function signInInBrowser(authorizeUrl: string, supabaseUrl: string): Promise<{ code: string } | { error: string }> {
  if (!supabaseUrl || !authorizeUrl.startsWith(`${supabaseUrl}/auth/v1/authorize`)) {
    return Promise.resolve({ error: 'not a sign-in link for this cellar' });
  }

  return new Promise((resolve) => {
    let settled = false;
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', OAUTH_CALLBACK);
      if (url.pathname !== '/callback') return void res.writeHead(404).end();
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error_description') ?? url.searchParams.get('error');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(PAGE);
      finish(code ? { code } : { error: error ?? 'google did not hand back a code' });
    });

    const timer = setTimeout(
      () => finish({ error: 'nothing came back from the browser — sign in with your phone instead' }),
      WAIT_MS,
    );

    function finish(result: { code: string } | { error: string }) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      resolve(result);
    }

    server.once('error', () => finish({ error: `port ${OAUTH_PORT} is busy — is an mcp login running?` }));
    server.listen(OAUTH_PORT, '127.0.0.1', () => void shell.openExternal(authorizeUrl));
  });
}
