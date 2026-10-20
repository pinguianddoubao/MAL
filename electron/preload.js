// 向渲染进程暴露 MALBridge（与 Android 端同名，前端复用同一套接口）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('MALBridge', {
  isNative: () => true,
  platform: process.platform,
  toast: (msg) => ipcRenderer.invoke('toast', msg),
  getGameDir: () => ipcRenderer.invoke('getGameDir'),
  getDataDir: () => ipcRenderer.invoke('getDataDir'),

  localLogin: (username) => ipcRenderer.invoke('localLogin', username),
  getCurrentAccount: () => ipcRenderer.invoke('getCurrentAccount'),
  getAccountList: () => ipcRenderer.invoke('getAccountList'),
  microsoftLogin: () => ipcRenderer.invoke('microsoftLogin'),

  requestVersions: (callbackId) => {
    ipcRenderer.invoke('requestVersions').then((versions) => {
      window.MALBridgeCallback && window.MALBridgeCallback(callbackId, versions);
    });
  },

  launchGame: (version) => ipcRenderer.invoke('launchGame', version),
});

ipcRenderer.on('accountChanged', (_event, json) => {
  window.MALAccountChanged && window.MALAccountChanged(json);
});
ipcRenderer.on('launchProgress', (_event, data) => {
  window.MALLaunchProgress && window.MALLaunchProgress(data);
});
