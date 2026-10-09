import { contextBridge, ipcRenderer } from 'electron';

/**
 * What Cellar's own page sees of the pc: `window.cellarDesk`.
 *
 * The page asks the host the same questions a paired phone asks over the LAN —
 * `request` is that API, in-process, without a key, because this window is the
 * pc. The rest is what only the pc's own window may do: show the pairing code,
 * forget the paired phones, and hand over the session the host acts with.
 *
 * Its shape is mirrored in the app's `features/desk/bridge.ts`; change both.
 */
contextBridge.exposeInMainWorld('cellarDesk', {
  version: 1,
  request: (method: string, path: string, body?: unknown) => ipcRenderer.invoke('desk:request', { method, path, body }),
  pairing: () => ipcRenderer.invoke('desk:pairing'),
  setSession: (session: { accessToken: string; userId: string } | null) => ipcRenderer.invoke('desk:session', session),
  forgetPhones: () => ipcRenderer.invoke('desk:forget'),
  rename: (name: string) => ipcRenderer.invoke('desk:rename', name),
  status: () => ipcRenderer.invoke('desk:status'),
  googleSignIn: (authorizeUrl: string) => ipcRenderer.invoke('desk:oauth', authorizeUrl),
});
