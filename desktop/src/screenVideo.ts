import { BrowserWindow, desktopCapturer, ipcMain, screen } from 'electron';
import { join } from 'node:path';
import { APP_ORIGIN } from './web.ts';

/** Chromium captures and hardware-encodes the display; no repeated thumbnail requests. */
export class ScreenVideo {
  private window: BrowserWindow | null = null; private ready: Promise<void> | null = null;
  constructor() {
    ipcMain.handle('desk:capture-source', async (event, displayId?: string) => {
      if (event.sender.id !== this.window?.webContents.id || event.senderFrame !== event.sender.mainFrame) throw new Error('Not the screen capture renderer.');
      const display = displayId ?? String(screen.getPrimaryDisplay().id);
      if (!screen.getAllDisplays().some((d) => String(d.id) === display)) throw new Error('Display unavailable.');
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
      const source = sources.find((source) => source.display_id === display); if (!source) throw new Error('Display unavailable.'); return source.id;
    });
  }
  private open() {
    if (this.ready) return this.ready;
    const window = new BrowserWindow({ show: false, width: 16, height: 16, webPreferences: { preload: join(__dirname, 'capturePreload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
    this.window = window;
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    this.ready = window.loadURL(`${APP_ORIGIN}/capture.html`).then(() => {});
    window.once('closed', () => { if (this.window === window) { this.window = null; this.ready = null; } });
    return this.ready;
  }
  async answer(id: string, offer: { type: 'offer'; sdp: string }, displayId?: string) {
    await this.open();
    const display = displayId ?? String(screen.getPrimaryDisplay().id);
    return this.window!.webContents.executeJavaScript(`window.cellarVideo.answer(${JSON.stringify(id)},${JSON.stringify(offer)},${JSON.stringify(display)})`) as Promise<{ type: 'answer'; sdp: string }>;
  }
  release(id: string) { if (this.window && !this.window.isDestroyed()) void this.window.webContents.executeJavaScript(`window.cellarVideo.release(${JSON.stringify(id)})`).catch(() => {}); }
  close() { this.window?.destroy(); this.window = null; this.ready = null; }
}
