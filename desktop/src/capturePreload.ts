import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('cellarCapture', { source: (displayId: string) => ipcRenderer.invoke('desk:capture-source', displayId) });
