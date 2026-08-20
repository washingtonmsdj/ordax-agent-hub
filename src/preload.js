const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentHub', {
  getState: () => ipcRenderer.invoke('state:get'),
  setState: (state) => ipcRenderer.invoke('state:set', state),
  pickRepo: () => ipcRenderer.invoke('repo:pick'),
  gitInfo: (repoPath) => ipcRenderer.invoke('repo:gitInfo', repoPath),
  openFolder: (repoPath) => ipcRenderer.invoke('repo:openFolder', repoPath),
  openExternal: (url) => ipcRenderer.invoke('external:open', url)
});
