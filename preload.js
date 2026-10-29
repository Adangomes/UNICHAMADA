const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('unichamada', {
  ativarLicenca: (serial) => ipcRenderer.invoke('licenca:ativar', serial)
});