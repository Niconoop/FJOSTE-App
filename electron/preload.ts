import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  closeWindow: () => ipcRenderer.send('window-close'),
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  configureAfk: (config: any) => ipcRenderer.send('afk-configure', config),
  toggleAfk: () => ipcRenderer.send('afk-toggle'),
  getAfkStatus: () => ipcRenderer.invoke('afk-status'),
  getRpcStatus: () => ipcRenderer.invoke('rpc-status'),
  toggleRpc: (enabled: boolean) => ipcRenderer.send('rpc-toggle', enabled),
  onAfkStatusChange: (callback: (status: boolean) => void) => {
    ipcRenderer.on('afk-status-changed', (_e, status) => callback(status));
  },
  onRpcStatusChange: (callback: (status: boolean) => void) => {
    ipcRenderer.on('rpc-status-changed', (_e, status) => callback(status));
  },
  onTelemetryUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('telemetry-update', (_e, data) => callback(data));
  },
  getTelemetryStatus: () => ipcRenderer.invoke('telemetry-status'),
})

