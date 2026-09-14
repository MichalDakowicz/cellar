import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { stdout } from 'node:process';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Google sign-in for a thing with no browser of its own.
 *
 * The app does PKCE through `expo-web-browser` and catches the redirect on the
 * `cellar://` scheme. Node cannot be handed a custom scheme, so it stands up a
 * one-request HTTP server on a fixed port, sends the browser there, and takes
 * the code out of the query string. Same flow, different letterbox.
 *
 * The port is fixed rather than picked at random because the redirect URL has
 * to be allow-listed in the Supabase dashboard once, and a random port cannot
 * be.
 */

export const CALLBACK_PORT = 54545;

/**
 * `127.0.0.1`, never `localhost`.
 *
 * On Windows `localhost` resolves to `::1` first, so a server bound to
 * `127.0.0.1` never sees the redirect and the browser hangs on a blank tab with
 * the sign-in already completed — the confusing half of that being that Google
 * and Supabase both did their jobs. Binding `::` instead would fix it by
 * listening on every interface, which is not what a five-minute local auth
 * handshake should be doing. The literal address has no such ambiguity.
 */
export const CALLBACK_HOST = '127.0.0.1';
export const CALLBACK_URL = `http://${CALLBACK_HOST}:${CALLBACK_PORT}/callback`;

/** Opens a URL in whatever the OS considers the browser. */
function openInBrowser(url: string): void {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  try {
    spawn(command, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    // Headless, or no handler registered. The URL is printed either way.
  }
}

const PAGE = (title: string, body: string) =>
  `<!doctype html><meta charset="utf-8"><title>${title}</title>` +
  '<body style="font:15px system-ui;background:#0a0a0a;color:#fafafa;display:grid;place-items:center;height:100vh;margin:0">' +
  `<div style="text-align:center"><p style="font-size:20px;font-weight:600">${title}</p><p style="color:#a3a3a3">${body}</p></div>`;

/** Waits for one redirect and hands back its `code`. */
function awaitCode(timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', CALLBACK_URL);
      if (!url.pathname.startsWith('/callback')) {
        response.writeHead(404).end();
        return;
      }

      const code = url.searchParams.get('code');
      const failure = url.searchParams.get('error_description') ?? url.searchParams.get('error');

      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(
        code
          ? PAGE('Signed in', 'You can close this tab and go back to the terminal.')
          : PAGE('Sign-in failed', failure ?? 'No code came back.'),
      );

      server.close();
      clearTimeout(timer);
      if (code) resolve(code);
      else reject(new Error(failure ?? 'No code came back from Google.'));
    });

    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Timed out waiting for the browser.'));
    }, timeoutMs);

    server.on('error', (error) => {
      clearTimeout(timer);
      reject(
        (error as NodeJS.ErrnoException).code === 'EADDRINUSE'
          ? new Error(`Port ${CALLBACK_PORT} is busy. Close whatever is using it and try again.`)
          : error,
      );
    });

    server.listen(CALLBACK_PORT, CALLBACK_HOST);
  });
}

export async function signInWithGoogle(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: CALLBACK_URL, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google did not hand back a sign-in link.');

  stdout.write('\nOpening your browser. If nothing happens, paste this in yourself:\n');
  stdout.write(`${data.url}\n\n`);
  openInBrowser(data.url);

  const code = await awaitCode(5 * 60_000);
  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}
