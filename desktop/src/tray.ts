import { Menu, nativeImage, Tray, type BrowserWindow } from 'electron';

import { iconPath, showWindow } from './window.ts';

let tray: Tray | null = null;

/** Where the app lives once the window is hidden. Held at module scope so it is not collected. */
export function createTray(window: BrowserWindow, packaged: boolean, quit: () => void): Tray {
  tray = new Tray(nativeImage.createFromPath(iconPath(packaged)).resize({ width: 16, height: 16 }));
  tray.setToolTip('Cellar');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'open cellar', click: () => showWindow(window) },
      { label: 'pair a phone', click: () => showWindow(window, '/desk') },
      { type: 'separator' },
      { label: 'quit cellar', click: quit },
    ]),
  );
  tray.on('click', () => showWindow(window));
  return tray;
}
