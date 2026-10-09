import { app, BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron';

import { DeskHost } from './host/host.ts';
import { signInInBrowser } from './oauth.ts';
import { readSession } from './session.ts';
import { createTray } from './tray.ts';
import { APP_ORIGIN, registerWebScheme, serveWeb } from './web.ts';
import { createWindow, showWindow } from './window.ts';

/**
 * Cellar on the pc.
 *
 * The window is Cellar itself — the same web build the site serves, loaded
 * from inside the app. The main process is the half the phone talks to: the
 * LAN server, the agent runs, the page proxies, the screen, the builds, and the
 * cellar fallback for when the phone is away. Closing the window hides it; the
 * tray keeps the pc reachable until you quit from there.
 */

registerWebScheme();

const dev = process.argv.includes('--dev');
let quitting = false;
let host: DeskHost | null = null;
let window: BrowserWindow | null = null;

// A second copy only hands focus to the first. It must not get as far as
// building a host: it would bind the next port and confuse every phone.
const first = app.requestSingleInstanceLock();
if (!first) app.quit();

/** A frame of the primary display, at most 1600 wide — a phone screen does not need more. */
async function frame(): Promise<Buffer | null> {
  const { width, height } = screen.getPrimaryDisplay().size;
  const scale = Math.min(1, 1600 / width);
  const [source] = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(width * scale), height: Math.round(height * scale) },
  });
  return source ? source.thumbnail.toJPEG(70) : null;
}

/** Only Cellar's own page may reach the host; a page it navigated to must not. Compared by origin, never prefix. */
function fromCellar(url: string): boolean {
  try {
    const { origin, protocol, host } = new URL(url);
    if (protocol === 'cellar-desk:') return `${protocol}//${host}` === APP_ORIGIN;
    return dev && origin === 'http://localhost:8081';
  } catch {
    return false;
  }
}

function registerIpc(desk: DeskHost): void {
  const guard = <A extends unknown[], R>(fn: (...args: A) => R) =>
    (event: Electron.IpcMainInvokeEvent, ...args: A): R => {
      if (!fromCellar(event.senderFrame?.url ?? '')) throw new Error('not cellar');
      return fn(...args);
    };

  ipcMain.handle('desk:request', guard((req: { method: string; path: string; body?: unknown }) => desk.request(req)));
  ipcMain.handle('desk:pairing', guard(() => desk.pairing()));
  ipcMain.handle('desk:session', guard((raw: unknown) => desk.setSession(readSession(raw))));
  ipcMain.handle('desk:forget', guard(() => desk.forgetPhones()));
  ipcMain.handle('desk:rename', guard((name: unknown) => typeof name === 'string' && desk.rename(name)));
  ipcMain.handle('desk:status', guard(() => ({ fallback: desk.fallback.status })));
  ipcMain.handle(
    'desk:oauth',
    guard((url: unknown) =>
      typeof url === 'string'
        ? signInInBrowser(url, process.env.CELLAR_SUPABASE_URL ?? '').then((result) => {
            if (window) showWindow(window);
            return result;
          })
        : { error: 'no link' },
    ),
  );
}

app.on('second-instance', () => window && showWindow(window));

app.on('before-quit', () => {
  quitting = true;
  host?.stop();
});

void app.whenReady().then(async () => {
  if (!first) return;
  serveWeb(app.isPackaged);
  host = new DeskHost({
    dataDir: app.getPath('userData'),
    version: app.getVersion(),
    supabaseUrl: process.env.CELLAR_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.CELLAR_SUPABASE_ANON_KEY ?? '',
    frames: frame,
  });
  try {
    const port = await host.start();
    console.log(`cellar desk listening on ${port}`);
  } catch (error) {
    // The window still opens: Cellar works without the LAN half, and it can say why.
    console.error('cellar desk could not listen', error);
  }
  registerIpc(host);
  window = createWindow({ dev, isQuitting: () => quitting, fromCellar });
  createTray(window, app.isPackaged, () => {
    quitting = true;
    app.quit();
  });
});
