import { net, protocol } from 'electron';
import { existsSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Cellar's web build, served to the window from inside the app.
 *
 * A custom scheme rather than `file://`: the build is a single-page app whose
 * routes are paths (`/entry/…`, `/desk`) and whose assets are root-relative
 * (`/_expo/static/…`), and both only work from the root of an origin. The scheme
 * is registered standard and secure, so it is an origin with its own storage —
 * the session survives a restart — and a secure context, so WebCrypto works.
 */

export const WEB_SCHEME = 'cellar-desk';
export const APP_ORIGIN = `${WEB_SCHEME}://app`;

export function registerWebScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: WEB_SCHEME,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
    },
  ]);
}

export function webRoot(packaged: boolean): string {
  // Packaged, electron-builder copies the build into resources/web; from source,
  // it is the app's own `npm run build:web` output two folders up.
  return packaged ? join(process.resourcesPath, 'web') : join(__dirname, '..', '..', 'dist');
}

/**
 * Scripts only from the build itself. This page holds `window.cellarDesk`,
 * which can start an agent on the pc, so a script injected into it — a hostile
 * dependency, a bug that renders text as markup — must not run. Styles may be
 * inline (react-native-web writes its own), data goes to Supabase over https and
 * wss, and pictures come from wherever a link preview points.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob: https:",
  'frame-src https:',
  "object-src 'none'",
  "base-uri 'none'",
].join('; ');

export function serveWeb(packaged: boolean): void {
  const root = webRoot(packaged);
  protocol.handle(WEB_SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    let file = normalize(join(root, decodeURIComponent(pathname)));
    // Anything outside the build, or any route that is not a file, is the app's
    // own index — the router inside it decides what the path means.
    if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(root, 'index.html');
    }
    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set('content-security-policy', CSP);
    return new Response(response.body, { status: response.status, headers });
  });
}
