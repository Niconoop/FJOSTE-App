import { ipcRenderer, contextBridge } from 'electron'

const apiObject = {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  configureAfk: (config: any) => ipcRenderer.send('afk-configure', config),
  toggleAfk: () => ipcRenderer.send('afk-toggle'),
  getAfkStatus: () => ipcRenderer.invoke('afk-status'),
  getRpcStatus: () => ipcRenderer.invoke('rpc-status'),
  toggleRpc: (enabled: boolean) => ipcRenderer.send('rpc-toggle', enabled),
  onAfkStatusChange: (callback: (status: boolean) => void) => {
    const listener = (_e: any, status: boolean) => callback(status);
    ipcRenderer.on('afk-status-changed', listener);
    return () => ipcRenderer.removeListener('afk-status-changed', listener);
  },
  onRpcStatusChange: (callback: (status: boolean) => void) => {
    const listener = (_e: any, status: boolean) => callback(status);
    ipcRenderer.on('rpc-status-changed', listener);
    return () => ipcRenderer.removeListener('rpc-status-changed', listener);
  },
  onTelemetryUpdate: (callback: (data: any) => void) => {
    const listener = (_e: any, data: any) => callback(data);
    ipcRenderer.on('telemetry-update', listener);
    return () => ipcRenderer.removeListener('telemetry-update', listener);
  },
  getTelemetryStatus: () => ipcRenderer.invoke('telemetry-status'),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', apiObject);
  } catch (e) {
    console.error('Failed to expose electronAPI via contextBridge:', e);
  }
} else {
  try {
    (window as any).electronAPI = apiObject;
  } catch (e) {
    console.error('Failed to expose electronAPI on window object:', e);
  }
}
