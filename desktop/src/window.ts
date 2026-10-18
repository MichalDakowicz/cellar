import { BrowserWindow, shell } from 'electron';
import { join } from 'node:path';

import { APP_ORIGIN } from './web.ts';
import { RENDERER_DEV_ORIGIN } from './ipcBoundary.ts';

const ownedWindows = new Map<number, BrowserWindow>();
export function ownsRenderer(id: number): boolean { return ownedWindows.has(id); }

/**
 * The primary window hides on close so the phone can still reach the host.
 * Secondary Cellar pages close normally and share the existing profile.
 *
 * Anything that is not Cellar opens in the real browser: a link in a thought, a
 * repo, a sign-in provider. The window never becomes a general browser, because
 * the bridge to the host is only offered to Cellar's own origin.
 */

export function iconPath(packaged: boolean): string {
  return packaged ? join(process.resourcesPath, 'icon.png') : join(__dirname, '..', '..', 'assets', 'images', 'icon.png');
}

export function createWindow(options: {
  dev: boolean;
  startHidden?: boolean;
  isQuitting: () => boolean;
  fromCellar: (url: string) => boolean;
  url?: string;
}): BrowserWindow {
  const window = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: 'Cellar',
    backgroundColor: '#09090b',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  const rendererId = window.webContents.id;
  ownedWindows.set(rendererId, window);
  window.once('closed', () => ownedWindows.delete(rendererId));

  window.once('ready-to-show', () => { if (!options.startHidden) window.show(); });
  window.on('close', (event) => {
    if (options.isQuitting() || options.url) return;
    event.preventDefault();
    window.hide();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (options.fromCellar(url)) {
      createWindow({ ...options, startHidden: false, url });
      return { action: 'deny' };
    }
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (options.fromCellar(url)) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) void shell.openExternal(url);
  });

  void window.loadURL(options.url ?? (options.dev ? RENDERER_DEV_ORIGIN : `${APP_ORIGIN}/`));
  return window;
}

export function showWindow(window: BrowserWindow, path?: string): void {
  if (path) void window.loadURL(`${APP_ORIGIN}${path}`);
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}
