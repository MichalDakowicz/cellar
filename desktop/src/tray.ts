import { Menu, nativeImage, Notification, Tray, type BrowserWindow } from 'electron';
import { randomUUID } from 'node:crypto';
import type { Controls } from './host/controls.ts';
import { controlMessage } from '@/lib/deskDispatch';

import { iconPath, showWindow } from './window.ts';

let tray: Tray | null = null;

/** Where the app lives once the window is hidden. Held at module scope so it is not collected. */
export function createTray(window: BrowserWindow, packaged: boolean, quit: () => void, controls?: Controls): Tray {
  tray = new Tray(nativeImage.createFromPath(iconPath(packaged)).resize({ width: 16, height: 16 }));
  tray.setToolTip('Cellar');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'open cellar', click: () => showWindow(window) },
      { label: 'pair a phone', click: () => showWindow(window, '/desk') },
      { label: 'stop all agents on every host', enabled: !!controls, click: () => {
        const commandId = randomUUID();
        const announce = (message: string) => { tray?.setToolTip(`Cellar · ${message}`.slice(0, 120)); if (Notification.isSupported()) new Notification({ title: 'Cellar · Stop all', body: message }).show(); };
        void controls!.run({ commandId, action: 'stopAll', runId: null, scope: 'account', source: 'pc' }).then((receipt) => {
          announce(controlMessage(receipt));
          if (receipt.state === 'pending') {
            const timer = setInterval(() => { void controls!.receipt(commandId).then((next) => {
              if (next && next.state !== 'pending') { clearInterval(timer); announce(controlMessage(next)); }
            }).catch(() => { clearInterval(timer); announce('Stop results unavailable; check the original receipt in Cellar.'); }); }, 5000);
            timer.unref();
          }
        }).catch((error) => announce(String(error)));
      } },
      { type: 'separator' },
      { label: 'quit cellar', click: quit },
    ]),
  );
  tray.on('click', () => showWindow(window));
  return tray;
}
