import { app, BrowserWindow, desktopCapturer, ipcMain, screen, powerMonitor, safeStorage, dialog } from 'electron';
import { WindowsInput } from './windowsInput.ts';
import { join } from 'node:path';
import { ScreenVideo } from './screenVideo.ts';

import { DeskHost } from './host/host.ts';
import { DesktopVoice } from './voice.ts';
import { signInInBrowser } from './oauth.ts';
import { readSession } from './session.ts';
import { createTray } from './tray.ts';
import { registerWebScheme, serveWeb } from './web.ts';
import { createWindow, ownsRenderer, showWindow } from './window.ts';
import { isCellarOrigin, isRendererSender, readIpcRequest } from './ipcBoundary.ts';

/**
 * Cellar on the pc.
 *
 * The window is Cellar's dedicated DOM renderer, loaded from inside the app.
 * The main process is the half the phone talks to: the
 * LAN server, the agent runs, the page proxies, the screen, the builds, and the
 * cellar fallback for when the phone is away. Closing the window hides it; the
 * tray keeps the pc reachable until you quit from there.
 */

registerWebScheme();

const dev = process.argv.includes('--dev');
let quitting = false;
let host: DeskHost | null = null;
let window: BrowserWindow | null = null;
const voice = new DesktopVoice();
const inputWorker = new WindowsInput();
let locked = false;
let screenVideo: ScreenVideo | null = null;

// A second copy only hands focus to the first. It must not get as far as
// building a host: it would bind the next port and confuse every phone.
const first = app.requestSingleInstanceLock();
if (!first) app.quit();

/** A frame of the primary display, at most 1600 wide — a phone screen does not need more. */
async function frame(): Promise<Buffer | null> {
  const { width, height } = screen.getPrimaryDisplay().size;
  const scale = Math.min(1, 1600 / width);
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: Math.round(width * scale), height: Math.round(height * scale) },
  });
  const source = sources.find((s) => s.display_id === String(screen.getPrimaryDisplay().id)) ?? sources[0];
  return source ? source.thumbnail.toJPEG(70) : null;
}

/** Only Cellar's own page may reach the host; a page it navigated to must not. Compared by origin, never prefix. */
function fromCellar(url: string): boolean {
  return isCellarOrigin(url, dev);
}

function registerIpc(desk: DeskHost): void {
  const guard = <A extends unknown[], R>(fn: (...args: A) => R) =>
    (event: Electron.IpcMainInvokeEvent, ...args: A): R => {
      if (!isRendererSender({ url: event.senderFrame?.url ?? '', dev, senderId: event.sender.id,
        windowId: ownsRenderer(event.sender.id) ? event.sender.id : null, topLevel: event.senderFrame === event.sender.mainFrame })) throw new Error('not cellar');
      return fn(...args);
    };

  ipcMain.handle('desk:request', guard((raw: unknown) => desk.request(readIpcRequest(raw))));
  ipcMain.handle('desk:voice', guard((id: unknown) => voice.listen(id)));
  ipcMain.handle('desk:voice-stop', guard((id: unknown) => voice.stop(id)));
  ipcMain.handle('desk:pairing', guard((network?: unknown) => desk.pairing(network === 'tailnet' ? 'tailnet' : 'lan')));
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

app.on('second-instance', (_event, commandLine) => {
  if (!window) return;
  if (commandLine.includes('--tray')) window.hide();
  else showWindow(window);
});

let hostStopped = false;
app.on('before-quit', (event) => {
  quitting = true;
  voice.stop();
  if (!host || hostStopped) return;
  event.preventDefault();
  void host.stop().finally(() => { hostStopped = true; app.quit(); });
});

void app.whenReady().then(async () => {
  if (!first) return;
  serveWeb(app.isPackaged);
  powerMonitor.on('lock-screen', () => { locked = true; host?.deps.screenControl?.revoke(); host?.deps.phones?.reset(); });
  powerMonitor.on('unlock-screen', () => { locked = false; });
  locked = powerMonitor.getSystemIdleState(300) === 'locked';
  screenVideo = new ScreenVideo();
  host = new DeskHost({
    phoneServerFile: app.isPackaged ? join(process.resourcesPath, 'scrcpy', 'scrcpy-server-v4.0') : join(__dirname, '..', 'vendor', 'scrcpy-server-v4.0'),
    vault: { available: () => safeStorage.isEncryptionAvailable(), encrypt: (text) => safeStorage.encryptString(text), decrypt: (value) => safeStorage.decryptString(value) },
    dataDir: app.getPath('userData'),
    version: app.getVersion(),
    supabaseUrl: process.env.CELLAR_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.CELLAR_SUPABASE_ANON_KEY ?? '',
    frames: frame,
    screenAdapter: process.platform === 'win32' ? {
      locked: () => locked,
      prepare: () => inputWorker.prepare(),
      close: () => { inputWorker.close(); screenVideo?.close(); },
      answer: (id, offer, displayId) => screenVideo!.answer(id, offer, displayId),
      closePeer: (id) => screenVideo?.release(id),
      displays: () => screen.getAllDisplays().map((d, i) => ({ id: String(d.id), name: d.label || `Display ${i + 1}`, aspect: d.size.width / d.size.height, primary: d.id === screen.getPrimaryDisplay().id })),
      aspect: () => { const d = screen.getPrimaryDisplay().size; return d.width / d.height; },
      input: (input, displayId) => { const d = screen.getAllDisplays().find((d) => String(d.id) === displayId) ?? screen.getPrimaryDisplay(); const origin = screen.dipToScreenPoint({ x: d.bounds.x, y: d.bounds.y }); return inputWorker.input(input, { x: origin.x, y: origin.y, width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) }); },
      confirm: async () => {
        const result = await dialog.showMessageBox({ type: 'question', title: 'Share and control this PC?', message: 'A paired phone wants to see and control your displays.', detail: 'The phone can switch between connected displays. Touch, keyboard and dictated text can act in any focused app. Access ends after ten minutes, when the phone leaves, or when this PC locks. Trust skips this prompt for the current pairing and account. Revoke trust in Cellar phone tools.', buttons: ['Deny', 'Allow once', 'Trust this pairing'], defaultId: 0, cancelId: 0, noLink: true });
        return result.response === 2 ? 'trust' : result.response === 1 ? 'once' : 'deny';
      },
    } : undefined,
    activity: () => ({ idleSeconds: powerMonitor.getSystemIdleTime(), locked }),
  });
  try {
    const port = await host.start();
    console.log(`cellar desk listening on ${port}`);
  } catch (error) {
    // The window still opens: Cellar works without the LAN half, and it can say why.
    console.error('cellar desk could not listen', error);
  }
  registerIpc(host);
  window = createWindow({ dev, startHidden: process.argv.includes('--tray'), isQuitting: () => quitting, fromCellar });
  createTray(window, app.isPackaged, () => {
    quitting = true;
    app.quit();
  }, host.deps.controls);
});
