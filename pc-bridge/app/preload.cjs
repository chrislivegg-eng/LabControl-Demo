const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('labControlAgent', {
  getContext: () => ipcRenderer.invoke('agent:get-context'),
  login: credentials => ipcRenderer.invoke('agent:login', credentials),
  setPassword: data => ipcRenderer.invoke('agent:set-password', data),
  onStatus: callback => ipcRenderer.on('agent-status', (_event, message) => callback(message)),
  onLoginRequired: callback => ipcRenderer.on('login-required', (_event, message) => callback(message)),
  onLoginSuccess: callback => ipcRenderer.on('login-success', (_event, session) => callback(session))
});
