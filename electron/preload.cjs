// Ponte segura entre a interface (renderer) e o processo principal.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wbNative', {
  platform: process.platform,
  storage: {
    listSites: () => ipcRenderer.invoke('sites:list'),
    getSite: (id) => ipcRenderer.invoke('sites:get', id),
    saveSite: (site) => ipcRenderer.invoke('sites:save', site),
    deleteSite: (id) => ipcRenderer.invoke('sites:delete', id),
  },
  /** Pede uma pasta ao usuário e grava os arquivos do site. Retorna o caminho ou null se cancelado. */
  exportSite: (folderName, files) => ipcRenderer.invoke('export:site', { folderName, files }),
  openExported: (dir, file) => ipcRenderer.invoke('shell:openExported', dir, file),
  onBeforeClose: (callback) => {
    ipcRenderer.removeAllListeners('app:before-close');
    ipcRenderer.on('app:before-close', () => callback());
  },
  closeReady: () => ipcRenderer.send('app:close-ready'),
});
