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

export function serveWeb(packaged: boolean): void {
  const root = webRoot(packaged);
  protocol.handle(WEB_SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    let file = normalize(join(root, decodeURIComponent(pathname)));
    // Anything outside the build, or any route that is not a file, is the app's
    // own index — the router inside it decides what the path means.
    if (!file.startsWith(root + sep) || !existsSync(file) || statSync(file).isDirectory()) {
      file = join(root, 'index.html');
    }
    return net.fetch(pathToFileURL(file).toString());
  });
}
